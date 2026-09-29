using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
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
    private readonly ILogger<AuthController> _logger;

    public AuthController(AppDbContext db, JwtService jwt, ILogger<AuthController> logger)
    {
        _db = db;
        _jwt = jwt;
        _logger = logger;
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

    // POST: /api/auth/register
    [HttpPost("register")]
    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    public async Task<ActionResult<AuthResponse>> Register([FromBody] RegisterRequest req, CancellationToken ct)
    {
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
            personal_data_consent = true,
            is_active = true,
            created_at = DateTime.Now
        };
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
        catch (DbUpdateException)
        {
            // гонка: логин/email успели занять между проверкой и вставкой
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

        user.password_hash = req.NewPassword; // хранение открытым текстом — требование курсового
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
        ExpiresAt = expires
    };
}
