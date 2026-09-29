using System.Diagnostics;

namespace VolunteerSystem.Server.Services;

/// <summary>
/// Компактный журнал запросов: метод, путь, код, длительность, пользователь.
/// Заголовки авторизации и тела запросов не пишутся — в лог попадает только метаданные.
/// </summary>
public class RequestLoggingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<RequestLoggingMiddleware> _logger;

    public RequestLoggingMiddleware(RequestDelegate next, ILogger<RequestLoggingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var sw = Stopwatch.StartNew();

        try
        {
            await _next(context);
        }
        finally
        {
            sw.Stop();

            var status = context.Response.StatusCode;
            var elapsed = sw.ElapsedMilliseconds;

            /* интересуют только медленные запросы и ошибки — остальное в Info пишется шумно */
            if (status >= 500 || elapsed >= 500)
                _logger.LogWarning(
                    "{Method} {Path} -> {Status} за {Elapsed} мс (пользователь: {User})",
                    context.Request.Method,
                    context.Request.Path.Value,
                    status,
                    elapsed,
                    context.User.Identity?.Name ?? "аноним");
            else
                _logger.LogInformation(
                    "{Method} {Path} -> {Status} за {Elapsed} мс",
                    context.Request.Method,
                    context.Request.Path.Value,
                    status,
                    elapsed);
        }
    }
}

public static class RequestLoggingExtensions
{
    public static IApplicationBuilder UseRequestLogging(this IApplicationBuilder app)
        => app.UseMiddleware<RequestLoggingMiddleware>();
}
