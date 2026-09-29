using System.Net.Sockets;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;
using System.Threading.RateLimiting;
using VolunteerSystem.Server.Data;
using VolunteerSystem.Server.Services;

var builder = WebApplication.CreateBuilder(args);

// ============================================================
// 1. DbContext -> SQL Server (БД IS_Volunteer)
//    EnableRetryOnFailure страхует от кратковременных обрывов соединения,
//    CommandTimeout не даёт запросу висеть бесконечно.
// ============================================================
builder.Services.AddDbContext<AppDbContext>(options =>
{
    options.UseSqlServer(
        builder.Configuration.GetConnectionString("DefaultConnection"),
        sql =>
        {
            sql.EnableRetryOnFailure(
                maxRetryCount: 5,
                maxRetryDelay: TimeSpan.FromSeconds(10),
                errorNumbersToAdd: null);
            sql.CommandTimeout(30);
        });
});

// ============================================================
// 2. Контроллеры + единый формат ошибок (RFC 7807 + поле message,
//    которое уже читает клиент)
// ============================================================
builder.Services
    .AddControllers()
    .ConfigureApiBehaviorOptions(options =>
    {
        options.SuppressMapClientErrors = true; // 400 отдаём сами, красиво
        options.InvalidModelStateResponseFactory = context =>
        {
            var first = context.ModelState
                .Where(kv => kv.Value?.Errors.Count > 0)
                .SelectMany(kv => kv.Value!.Errors.Select(e =>
                    string.IsNullOrWhiteSpace(e.ErrorMessage) ? "Некорректное значение" : e.ErrorMessage))
                .FirstOrDefault() ?? "Проверьте заполнение полей";

            var errors = context.ModelState
                .Where(kv => kv.Value?.Errors.Count > 0)
                .ToDictionary(kv => kv.Key, kv => kv.Value!.Errors.Select(e => e.ErrorMessage).ToArray());

            return new BadRequestObjectResult(new
            {
                type = "https://tools.ietf.org/html/rfc9110#section-15.5.1",
                title = "Ошибка валидации",
                status = StatusCodes.Status400BadRequest,
                message = first,
                errors,
                traceId = context.HttpContext.TraceIdentifier
            });
        };
    });

builder.Services.AddProblemDetails();

// ============================================================
// 3. JWT-аутентификация
// ============================================================
var jwt = builder.Configuration.GetSection(JwtOptions.SectionName);

if (string.IsNullOrWhiteSpace(jwt["Key"]) || jwt["Key"]!.Length < 32)
    throw new InvalidOperationException("Jwt:Key должен быть задан и содержать не менее 32 символов.");

// options-паттерн: настройки читаются и валидируются один раз при старте
builder.Services.AddOptions<JwtOptions>()
    .Bind(builder.Configuration.GetSection(JwtOptions.SectionName))
    .Validate(o => !string.IsNullOrWhiteSpace(o.Key) && o.Key.Length >= 32,
        "Jwt:Key должен быть задан и содержать не менее 32 символов")
    .Validate(o => o.ExpireMinutes is > 0 and <= 24 * 60,
        "Jwt:ExpireMinutes должен быть от 1 до 1440")
    .ValidateOnStart();

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.MapInboundClaims = false;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwt["Issuer"],
            ValidAudience = jwt["Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt["Key"]!)),
            // допуск на рассинхрон часов между сервером и клиентом
            ClockSkew = TimeSpan.FromSeconds(30)
        };

        /* Клиенту нужен JSON вместо пустого 401/403 */
        options.Events = new JwtBearerEvents
        {
            OnChallenge = async context =>
            {
                context.HandleResponse();
                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                context.Response.ContentType = "application/json";
                await context.Response.WriteAsync(JsonSerializer.Serialize(new
                {
                    status = StatusCodes.Status401Unauthorized,
                    title = "Требуется авторизация",
                    message = context.AuthenticateFailure is null
                        ? "Сессия истекла, войдите заново"
                        : "Токен недействителен или истёк, войдите заново",
                    traceId = context.HttpContext.TraceIdentifier
                }));
            },
            OnForbidden = async context =>
            {
                context.Response.StatusCode = StatusCodes.Status403Forbidden;
                context.Response.ContentType = "application/json";
                await context.Response.WriteAsync(JsonSerializer.Serialize(new
                {
                    status = StatusCodes.Status403Forbidden,
                    title = "Недостаточно прав",
                    message = "У вашей роли нет доступа к этому разделу",
                    traceId = context.HttpContext.TraceIdentifier
                }));
            }
        };
    });

builder.Services.AddAuthorization();
builder.Services.AddScoped<JwtService>();

// ============================================================
// 4. CORS для React-клиента
// ============================================================
var origins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
builder.Services.AddCors(options =>
{
    options.AddPolicy("client", policy =>
    {
        if (origins.Length > 0)
            policy.WithOrigins(origins).AllowAnyHeader().AllowAnyMethod().AllowCredentials();
        else
            policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod(); // без AllowCredentials
    });
});

// ============================================================
// 5. Производительность и диагностика
// ============================================================
builder.Services.AddResponseCompression(options =>
{
    options.EnableForHttps = true; // клиент ходит по HTTPS (Vite)
    options.MimeTypes = new[]
    {
        "text/plain", "text/css", "text/javascript", "application/javascript",
        "application/json", "application/xml", "image/svg+xml", "text/event-stream"
    };
});

builder.Services.AddHealthChecks()
    .AddDbContextCheck<AppDbContext>(name: "database", tags: new[] { "ready" });

// Защита от перебора пароля: 10 попыток в минуту с одного IP
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddFixedWindowLimiter("auth", limiter =>
    {
        limiter.PermitLimit = 10;
        limiter.Window = TimeSpan.FromMinutes(1);
        limiter.QueueLimit = 0;
        limiter.AutoReplenishment = true;
    });
    options.OnRejected = async (context, token) =>
    {
        context.HttpContext.Response.ContentType = "application/json";
        await context.HttpContext.Response.WriteAsync(JsonSerializer.Serialize(new
        {
            status = StatusCodes.Status429TooManyRequests,
            title = "Слишком много попыток",
            message = "Подождите минуту и повторите вход",
            traceId = context.HttpContext.TraceIdentifier
        }));
    };
});

// ============================================================
// 6. Swagger (новый синтаксис для Microsoft.OpenApi 2.x)
// ============================================================
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "VolunteerSystem API",
        Version = "v1",
        Description = "API системы управления волонтёрами. Авторизация — JWT (роль в токене)."
    });

    c.AddSecurityDefinition("bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Введите JWT-токен (без слова 'Bearer')"
    });

    c.AddSecurityRequirement(document => new OpenApiSecurityRequirement
    {
        [new OpenApiSecuritySchemeReference("bearer", document)] = new List<string>()
    });
});

var app = builder.Build();

// ============================================================
// 7. АВТОСОЗДАНИЕ БД ПРИ ПЕРВОМ ЗАПУСКЕ
//    SQL Server мог ещё подниматься — пробуем несколько раз.
// ============================================================
using (var scope = app.Services.CreateScope())
{
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();

    for (var attempt = 1; ; attempt++)
    {
        try
        {
            await DbInitializer.InitializeAsync(app.Configuration, logger);
            break;
        }
        catch (Exception ex) when (attempt < 6)
        {
            logger.LogWarning("БД недоступна (попытка {Attempt}/5): {Message}. Повтор через 3 с…", attempt, ex.Message);
            await Task.Delay(TimeSpan.FromSeconds(3));
        }
        catch (Exception ex)
        {
            logger.LogCritical(
                "Не удалось подготовить БД: {Message}. " +
                "Проверьте, что SQL Server (LocalDB) запущен и строка подключения верна.", ex.Message);
            throw;
        }
    }
}

// ============================================================
// 8. Pipeline
// ============================================================
app.UseExceptionHandler(new ExceptionHandlerOptions
{
    ExceptionHandler = async context =>
    {
        var feature = context.Features.Get<IExceptionHandlerFeature>();
        var (status, title) = feature?.Error switch
        {
            DbUpdateConcurrencyException => (StatusCodes.Status409Conflict, "Данные изменились другим пользователем"),
            DbUpdateException => (StatusCodes.Status409Conflict, "Не удалось сохранить изменения"),
            OperationCanceledException => (499, "Запрос отменён"),
            UnauthorizedAccessException => (StatusCodes.Status403Forbidden, "Недостаточно прав"),
            _ => (StatusCodes.Status500InternalServerError, "Внутренняя ошибка сервера")
        };

        if (status == StatusCodes.Status500InternalServerError)
            app.Logger.LogError(feature?.Error, "Необработанная ошибка: {Path}",
                context.Request.Path.Value);

        context.Response.StatusCode = status;
        context.Response.ContentType = "application/json";
        await context.Response.WriteAsync(JsonSerializer.Serialize(new
        {
            type = $"https://httpstatuses.com/{status}",
            title,
            status,
            message = status == StatusCodes.Status500InternalServerError
                ? "Внутренняя ошибка сервера. Повторите позже или посмотрите логи."
                : feature?.Error.Message,
            traceId = context.TraceIdentifier
        }));
    }
});

app.UseStatusCodePages(async context =>
{
    var response = context.HttpContext.Response;

    // JSON пишем только если ответ ещё не начат и не заполнен чужой разметкой
    if (response.HasStarted || response.ContentLength is not null) return;
    if (!string.IsNullOrEmpty(response.ContentType)) return;

    var (title, message) = response.StatusCode switch
    {
        StatusCodes.Status401Unauthorized => ("Требуется авторизация", "Сессия истекла, войдите заново"),
        StatusCodes.Status403Forbidden => ("Недостаточно прав", "У вашей роли нет доступа к этому разделу"),
        StatusCodes.Status404NotFound => ("Не найдено", "Запрашиваемый ресурс не найден"),
        StatusCodes.Status429TooManyRequests => ("Слишком много попыток", "Подождите минуту и повторите"),
        _ => ("Ошибка запроса", "Запрос не может быть обработан")
    };

    response.ContentType = "application/json";
    await response.WriteAsync(JsonSerializer.Serialize(new
    {
        type = $"https://httpstatuses.com/{response.StatusCode}",
        title,
        status = response.StatusCode,
        message,
        traceId = context.HttpContext.TraceIdentifier
    }));
});

if (app.Environment.IsDevelopment())
{
    app.UseRequestLogging();
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "VolunteerSystem API v1");
        c.RoutePrefix = "swagger";
        c.DocumentTitle = "VolunteerSystem API";
    });
}

// базовые защитные заголовки
app.Use(async (context, next) =>
{
    context.Response.Headers["X-Content-Type-Options"] = "nosniff";
    context.Response.Headers["X-Frame-Options"] = "SAMEORIGIN";
    context.Response.Headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
    context.Response.Headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()";
    await next();
});

app.UseDefaultFiles();
app.MapStaticAssets();

app.UseResponseCompression();
app.UseCors("client");
app.UseAuthentication();
app.UseAuthorization();
app.UseRateLimiter();

// ============================================================
// 9. Диагностика: health-check (корневой путь отдан SPA-прокси)
// ============================================================
app.MapHealthChecks("/health").AllowAnonymous();
app.MapHealthChecks("/api/health").AllowAnonymous();

app.MapControllers();
app.MapFallbackToFile("/index.html");

// ============================================================
// 10. Понятная ошибка вместо стектрейса, если порт занят
// ============================================================
try
{
    // Если фронтенд уже поднят — предупреждаем, иначе запуск из IDE выглядит «сломанным»
    if (app.Environment.IsDevelopment())
    {
        var devPort = builder.Configuration.GetValue("DevServerPort", 61000);
        try
        {
            using var probe = new TcpClient();
            await probe.ConnectAsync("localhost", devPort).WaitAsync(TimeSpan.FromMilliseconds(400));
            app.Logger.LogWarning(
                "Порт {Port} уже занят — вероятно, dev-сервер фронтенда уже запущен. " +
                "Приложение доступно: https://localhost:{Port}", devPort, devPort);
        }
        catch
        {
            /* порт свободен — ничего не сообщаем */
        }
    }

    app.Logger.LogInformation("API слушает: {Urls}",
        string.Join(", ", app.Urls.DefaultIfEmpty("по умолчанию из launchSettings.json")));
    app.Run();
}
catch (IOException ex)
{
    app.Logger.LogCritical(
        "Не удалось занять порт: {Message}. " +
        "Закройте уже запущенный экземпляр API (netstat -ano | findstr :5084) и запустите снова.", ex.Message);
    Environment.Exit(1);
}
