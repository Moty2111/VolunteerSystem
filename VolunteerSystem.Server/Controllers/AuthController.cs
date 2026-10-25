using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using System.Globalization;
using System.Security.Cryptography;
using System.Text.Json;
using VolunteerSystem.Server.Data;
using VolunteerSystem.Server.Dtos.Auth;
using VolunteerSystem.Server.Models;
using VolunteerSystem.Server.Services;

namespace VolunteerSystem.Server.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly JwtService _jwt;
    private readonly IWebHostEnvironment _env;
    private readonly ILogger<AuthController> _logger;
    private readonly IConfiguration _configuration;

    public AuthController(AppDbContext db, JwtService jwt, IWebHostEnvironment env, ILogger<AuthController> logger, IConfiguration configuration)
    {
        _db = db;
        _jwt = jwt;
        _env = env;
        _logger = logger;
        _configuration = configuration;
    }

    // POST: /api/auth/login
    // Защита от перебора: не больше 10 попыток в минуту с одного IP
    [HttpPost("login")]
    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    public async Task<ActionResult<AuthResponse>> Login([FromBody] LoginRequest req, CancellationToken ct)
    {
        var login = req.LoginName.Trim();
        var user = await _db.SystemUsers
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.login_name == login && u.is_active, ct);

        // ПРОСТОЕ СРАВНЕНИЕ БЕЗ ХЭША (только для отладки/курсового).
        // Одинаковый ответ для «нет пользователя» и «неверный пароль» —
        // иначе по ответу можно перебирать существующие логины.
        if (user is null || !string.Equals(user.password_hash, req.Password, StringComparison.Ordinal))
        {
            _logger.LogWarning("Неудачная попытка входа: {Login} (IP {Ip})", login, HttpContext.Connection.RemoteIpAddress);
            return Unauthorized(new { message = "Неверный логин или пароль" });
        }

        var (token, expires) = _jwt.Generate(user);

        return Ok(ToResponse(user, token, expires));
    }

    // POST: /api/auth/forgot-password — запрос ссылки на сброс пароля
    // В демо-режиме письма не отправляются: ссылка возвращается в ответе (demoResetLink).
    [HttpPost("forgot-password")]
    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest req, CancellationToken ct)
    {
        var email = req.Email.Trim();

        // Ищем учётную запись по email волонтёра либо по логину (для служебных аккаунтов)
        var user = await _db.SystemUsers
            .AsNoTracking()
            .FirstOrDefaultAsync(u =>
                (u.volunteer != null && u.volunteer.email == email && u.is_active)
                || (u.login_name == email && u.is_active), ct);

        // Одинаковый ответ независимо от того, найден ли email, — не раскрываем адреса
        var message = "Если такой email зарегистрирован, ссылка для сброса отправлена";

        if (user is not null)
        {
            var resetToken = Convert.ToHexString(RandomNumberGenerator.GetBytes(24));
            user.password_reset_token = resetToken;
            user.password_reset_expires = DateTime.Now.AddMinutes(30);

            _db.Attach(user);
            _db.Entry(user).Property(u => u.password_reset_token).IsModified = true;
            _db.Entry(user).Property(u => u.password_reset_expires).IsModified = true;
            await _db.SaveChangesAsync(ct);

            _logger.LogInformation("Запрошен сброс пароля для {Login} (email {Email})", user.login_name, email);

            var clientUrl = _configuration["App:ClientUrl"] ?? $"{Request.Scheme}://{Request.Host}";
            var demoResetLink = $"{clientUrl}/reset-password?token={resetToken}";
            return Ok(new { message, demoResetLink });
        }

        return Ok(new { message });
    }

    // POST: /api/auth/reset-password — установка нового пароля по токену
    [HttpPost("reset-password")]
    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest req, CancellationToken ct)
    {
        if (!string.IsNullOrWhiteSpace(req.Token))
        {
            var token = req.Token.Trim();
            var user = await _db.SystemUsers
                .FirstOrDefaultAsync(u => u.password_reset_token == token && u.is_active, ct);

            if (user is not null && user.password_reset_expires.HasValue && user.password_reset_expires > DateTime.Now)
            {
                if (!PasswordPolicy.IsValid(req.NewPassword))
                    return BadRequest(new { message = PasswordPolicy.Message });

                if (req.NewPassword == user.password_hash)
                    return BadRequest(new { message = "Новый пароль не должен совпадать со старым" });

                user.password_hash = req.NewPassword; // хранение открытым текстом — требование курсового
                user.password_reset_token = null;
                user.password_reset_expires = null;
                user.must_change_password = false;

                await _db.SaveChangesAsync(ct);

                _logger.LogInformation("Пароль сброшен по ссылке для {Login}", user.login_name);
                return Ok(new { message = "Пароль успешно обновлён — теперь можно войти" });
            }
        }

        return BadRequest(new { message = "Ссылка для сброса недействительна или истекла" });
    }

    // POST: /api/auth/register
    // Регистрация волонтёра. Медкнижка — необязательный блок: можно сразу
    // приложить скан и указать дату действия (статус «На проверке»).
    // Принимаем и multipart (форма со сканом), и JSON — чтобы регистрация
    // не зависела от того, что именно шлёт клиент.
    [HttpPost("register")]
    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    [RequestSizeLimit(10 * 1024 * 1024)]
    public async Task<ActionResult<AuthResponse>> Register(CancellationToken ct)
    {
        var req = new RegisterRequest();
        IFormFile? scan = null;

        if (Request.HasFormContentType)
        {
            var form = await Request.ReadFormAsync(ct);
            req.FullName = form["fullName"].ToString();
            req.Phone = form["phone"].ToString();
            req.Email = form["email"].ToString();
            req.City = form["city"].ToString();
            req.LoginName = form["loginName"].ToString();
            req.Password = form["password"].ToString();
            if (DateTime.TryParse(form["birthDate"], CultureInfo.InvariantCulture, DateTimeStyles.None, out var bd))
                req.BirthDate = bd;
            if (DateOnly.TryParse(form["medBookValidUntil"], CultureInfo.InvariantCulture, DateTimeStyles.None, out var until))
                req.MedBookValidUntil = until;
            scan = form.Files.GetFile("medBookScan");

            if (string.IsNullOrWhiteSpace(req.City))
                _logger.LogWarning("Регистрация: city пуст. Ключи формы: {Keys}", string.Join(", ", form.Keys));
        }
        else
        {
            using var reader = new StreamReader(Request.Body);
            var json = await reader.ReadToEndAsync(ct);
            if (!string.IsNullOrWhiteSpace(json))
            {
                try
                {
                    req = JsonSerializer.Deserialize<RegisterRequest>(
                              json,
                              new JsonSerializerOptions { PropertyNameCaseInsensitive = true })
                          ?? new RegisterRequest();
                }
                catch (JsonException)
                {
                    return BadRequest(new { message = "Некорректный формат запроса" });
                }
            }
        }

        if (!TryValidateModel(req))
            return ValidationProblem();

        var login = req.LoginName.Trim();
        var email = req.Email.Trim();

        if (await _db.Volunteers.AnyAsync(v => v.email == email, ct))
            return Conflict(new { message = "Email уже зарегистрирован" });

        if (await _db.SystemUsers.AnyAsync(u => u.login_name == login, ct))
            return Conflict(new { message = "Логин занят" });

        var age = DateTime.Today.Year - req.BirthDate.Year;
        if (req.BirthDate.Date > DateTime.Today.AddYears(-age)) age--;
        if (age < 14) return BadRequest(new { message = "Возраст меньше 14 лет" });
        if (age > 120) return BadRequest(new { message = "Проверьте дату рождения" });

        var volunteer = new Volunteer
        {
            full_name = req.FullName.Trim(),
            birth_date = DateOnly.FromDateTime(req.BirthDate),
            phone = req.Phone.Trim(),
            email = email,
            city = req.City.Trim(),
            med_book_valid_until = req.MedBookValidUntil,
            med_book_status = "Не загружена",
            personal_data_consent = true,
            is_active = true,
            created_at = DateTime.Now
        };

        // Если при регистрации приложен скан медкнижки — сохраняем его и ставим «На проверке»
        if (scan is not null)
        {
            if (!MedBookStorage.TrySaveScan(_env, scan, out var scanName, out var scanError))
                return BadRequest(new { message = $"Медкнижка: {scanError}" });

            volunteer.med_book_scan_path = scanName;
            volunteer.med_book_uploaded_at = DateTime.Now;
            volunteer.med_book_status = "На проверке";
        }

        _db.Volunteers.Add(volunteer);

        var user = new SystemUser
        {
            login_name = login,
            password_hash = req.Password, // ПРОСТО КАК ЕСТЬ — требование курсового
            system_role = "Волонтёр",
            is_active = true,
            created_at = DateTime.Now
        };
        // ссылку на волонтёра ставим сразу: одна транзакция вместо двух
        user.volunteer = volunteer;
        _db.SystemUsers.Add(user);

        try
        {
            await _db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException ex)
        {
            // гонка: логин/email успели занять между проверкой и вставкой
            _logger.LogWarning(ex, "Ошибка SaveChanges при регистрации {Login}", login);
            return Conflict(new { message = "Логин или email уже заняты" });
        }

        _logger.LogInformation("Зарегистрирован волонтёр {Login} (id {Id})", login, volunteer.volunteer_id);

        var (token, expires) = _jwt.Generate(user);
        return Ok(ToResponse(user, token, expires));
    }

    // GET: /api/auth/me
    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> Me(CancellationToken ct)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();

        var user = await _db.SystemUsers
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.user_id == userId && u.is_active, ct);

        if (user is null) return Unauthorized(new { message = "Пользователь отключён" });

        return Ok(new
        {
            userId = user.user_id,
            loginName = user.login_name,
            role = user.system_role,
            volunteerId = user.volunteer_id
        });
    }

    // POST: /api/auth/change-password — смена пароля (открытым текстом, без хэширования)
    [HttpPost("change-password")]
    [Authorize]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest req, CancellationToken ct)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();

        var user = await _db.SystemUsers.FirstOrDefaultAsync(u => u.user_id == userId, ct);
        if (user is null) return NotFound();

        if (!string.Equals(user.password_hash, req.CurrentPassword, StringComparison.Ordinal))
            return BadRequest(new { message = "Текущий пароль указан неверно" });

        if (req.NewPassword == req.CurrentPassword)
            return BadRequest(new { message = "Новый пароль не должен совпадать со старым" });

        if (!PasswordPolicy.IsValid(req.NewPassword))
            return BadRequest(new { message = PasswordPolicy.Message });

        user.password_hash = req.NewPassword; // хранение открытым текстом — требование курсового
        user.must_change_password = false; // обязательная смена выполнена
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation("Пароль обновлён пользователем {Login}", user.login_name);
        return Ok(new { message = "Пароль успешно обновлён" });
    }

    // === Helpers ===

    /// <summary>Берёт user_id из токена без исключений при кривом значении.</summary>
    private bool TryGetUserId(out int userId)
    {
        userId = 0;
        var raw = User.FindFirst("UserId")?.Value;
        return int.TryParse(raw, out userId);
    }

    private static AuthResponse ToResponse(SystemUser user, string token, DateTime expires) => new()
    {
        Token = token,
        LoginName = user.login_name,
        Role = user.system_role,
        VolunteerId = user.volunteer_id,
        ExpiresAt = expires,
        MustChangePassword = user.must_change_password
    };
}
