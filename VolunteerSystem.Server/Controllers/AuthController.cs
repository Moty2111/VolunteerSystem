using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
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

    public AuthController(AppDbContext db, JwtService jwt)
    {
        _db = db;
        _jwt = jwt;
    }

    // POST: /api/auth/login
    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult<AuthResponse>> Login([FromBody] LoginRequest req)
    {
        var user = await _db.SystemUsers
            .FirstOrDefaultAsync(u => u.login_name == req.LoginName && u.is_active);

        // ПРОСТОЕ СРАВНЕНИЕ БЕЗ ХЭША (только для отладки/курсового)
        if (user is null || user.password_hash != req.Password)
            return Unauthorized(new { message = "Неверный логин или пароль" });

        var (token, expires) = _jwt.Generate(user);

        return Ok(new AuthResponse
        {
            Token = token,
            LoginName = user.login_name,
            Role = user.system_role,
            VolunteerId = user.volunteer_id,
            ExpiresAt = expires
        });
    }

    // POST: /api/auth/register
    [HttpPost("register")]
    [AllowAnonymous]
    public async Task<ActionResult<AuthResponse>> Register([FromBody] RegisterRequest req)
    {
        if (await _db.Volunteers.AnyAsync(v => v.email == req.Email))
            return Conflict(new { message = "Email уже зарегистрирован" });

        if (await _db.SystemUsers.AnyAsync(u => u.login_name == req.LoginName))
            return Conflict(new { message = "Логин занят" });

        var age = DateTime.Today.Year - req.BirthDate.Year;
        if (req.BirthDate.Date > DateTime.Today.AddYears(-age)) age--;
        if (age < 14) return BadRequest(new { message = "Возраст меньше 14 лет" });

        var volunteer = new Volunteer
        {
            full_name = req.FullName,
            birth_date = DateOnly.FromDateTime(req.BirthDate),
            phone = req.Phone,
            email = req.Email,
            city = req.City,
            personal_data_consent = true,
            is_active = true,
            created_at = DateTime.Now
        };
        _db.Volunteers.Add(volunteer);
        await _db.SaveChangesAsync();

        var user = new SystemUser
        {
            volunteer_id = volunteer.volunteer_id,
            login_name = req.LoginName,
            password_hash = req.Password, // ПРОСТО КАК ЕСТЬ
            system_role = "Волонтёр",
            is_active = true,
            created_at = DateTime.Now
        };
        _db.SystemUsers.Add(user);
        await _db.SaveChangesAsync();

        var (token, expires) = _jwt.Generate(user);

        return Ok(new AuthResponse
        {
            Token = token,
            LoginName = user.login_name,
            Role = user.system_role,
            VolunteerId = volunteer.volunteer_id,
            ExpiresAt = expires
        });
    }

    // GET: /api/auth/me
    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> Me()
    {
        var idClaim = User.FindFirst("UserId")?.Value;
        if (idClaim is null) return Unauthorized();

        var user = await _db.SystemUsers.FindAsync(int.Parse(idClaim));
        if (user is null) return NotFound();

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
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest req)
    {
        var idClaim = User.FindFirst("UserId")?.Value;
        if (idClaim is null) return Unauthorized();

        var user = await _db.SystemUsers.FindAsync(int.Parse(idClaim));
        if (user is null) return NotFound();

        if (user.password_hash != req.CurrentPassword)
            return BadRequest(new { message = "Текущий пароль указан неверно" });

        if (string.IsNullOrWhiteSpace(req.NewPassword) || req.NewPassword.Length < 6)
            return BadRequest(new { message = "Новый пароль должен содержать минимум 6 символов" });

        if (req.NewPassword == req.CurrentPassword)
            return BadRequest(new { message = "Новый пароль не должен совпадать со старым" });

        user.password_hash = req.NewPassword; // хранение открытым текстом — требование курсового
        await _db.SaveChangesAsync();

        return Ok(new { message = "Пароль успешно обновлён" });
    }
}