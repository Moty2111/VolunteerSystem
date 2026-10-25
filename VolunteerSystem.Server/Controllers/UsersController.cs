using System.Security.Cryptography;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VolunteerSystem.Server.Data;
using VolunteerSystem.Server.Dtos.Users;

namespace VolunteerSystem.Server.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UsersController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ILogger<UsersController> _logger;

    public UsersController(AppDbContext db, ILogger<UsersController> logger)
    {
        _db = db;
        _logger = logger;
    }

    // GET: /api/users — список учётных записей (без паролей)
    [HttpGet]
    [Authorize(Roles = "Администратор")]
    public async Task<ActionResult<IEnumerable<SystemUserDto>>> GetAll(CancellationToken ct)
    {
        var list = await _db.SystemUsers
            .AsNoTracking()
            .OrderByDescending(u => u.created_at)
            .Select(u => new SystemUserDto
            {
                UserId = u.user_id,
                LoginName = u.login_name,
                Role = u.system_role,
                VolunteerId = u.volunteer_id,
                VolunteerName = u.volunteer != null ? u.volunteer.full_name : null,
                IsActive = u.is_active,
                CreatedAt = u.created_at
            })
            .ToListAsync(ct);

        return Ok(list);
    }

    // PUT: /api/users/5/role — смена роли (нельзя менять свою)
    [HttpPut("{id:int}/role")]
    [Authorize(Roles = "Администратор")]
    public async Task<IActionResult> UpdateRole(int id, [FromBody] UpdateUserRoleDto dto, CancellationToken ct)
    {
        if (!UpdateUserRoleDto.Roles.Contains(dto.Role))
            return BadRequest(new { message = "Недопустимая роль" });

        if (CurrentUserId() == id)
            return BadRequest(new { message = "Нельзя менять роль собственной учётной записи" });

        var user = await _db.SystemUsers.FindAsync([id], ct);
        if (user is null) return NotFound(new { message = "Пользователь не найден" });

        var oldRole = user.system_role;
        user.system_role = dto.Role;
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation("Роль пользователя {Login} изменена: {Old} -> {New}",
            user.login_name, oldRole, dto.Role);

        return NoContent();
    }

    // PUT: /api/users/5/active — включение/отключение (нельзя отключить себя)
    [HttpPut("{id:int}/active")]
    [Authorize(Roles = "Администратор")]
    public async Task<IActionResult> UpdateActive(int id, [FromBody] UpdateUserActiveDto dto, CancellationToken ct)
    {
        if (CurrentUserId() == id && !dto.IsActive)
            return BadRequest(new { message = "Нельзя отключить собственную учётную запись" });

        var user = await _db.SystemUsers.FindAsync([id], ct);
        if (user is null) return NotFound(new { message = "Пользователь не найден" });

        user.is_active = dto.IsActive;
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation("Пользователь {Login} {State}", user.login_name,
            dto.IsActive ? "включён" : "отключён");

        return NoContent();
    }

    // POST: /api/users/5/reset-password — сброс пароля админом.
    // Ставит временный пароль и флаг обязательной смены при следующем входе.
    [HttpPost("{id:int}/reset-password")]
    [Authorize(Roles = "Администратор")]
    public async Task<IActionResult> ResetPassword(int id, [FromBody] AdminResetPasswordRequest dto, CancellationToken ct)
    {
        var user = await _db.SystemUsers.FindAsync([id], ct);
        if (user is null) return NotFound(new { message = "Пользователь не найден" });

        var tempPassword = string.IsNullOrWhiteSpace(dto.NewPassword)
            ? GenerateTempPassword()
            : dto.NewPassword.Trim();

        user.password_hash = tempPassword;
        user.must_change_password = true;
        user.password_reset_token = null;
        user.password_reset_expires = null;
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation("Админ сбросил пароль пользователя {Login}", user.login_name);

        return Ok(new
        {
            message = "Пароль сброшен — пользователь сменит его при следующем входе",
            tempPassword
        });
    }

    /// <summary>id текущего пользователя; 0 — если claim отсутствует или неверен.</summary>
    private int CurrentUserId() =>
        int.TryParse(User.FindFirst("UserId")?.Value, out var id) ? id : 0;

    /// <summary>Временный пароль, удовлетворяющий политике (без похожих символов).</summary>
    private static string GenerateTempPassword()
    {
        const string upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
        const string lower = "abcdefghijkmnopqrstuvwxyz";
        const string digits = "23456789";
        const string special = "!@#$%^&*";
        var pool = upper + lower + digits + special;

        var rng = RandomNumberGenerator.Create();
        int IndexIn(string set)
        {
            var b = new byte[4];
            rng.GetBytes(b);
            return (int)(BitConverter.ToUInt32(b, 0) % (uint)set.Length);
        }

        var chars = new char[10];
        chars[0] = upper[IndexIn(upper)];
        chars[1] = lower[IndexIn(lower)];
        chars[2] = digits[IndexIn(digits)];
        chars[3] = special[IndexIn(special)];
        for (var i = 4; i < chars.Length; i++)
            chars[i] = pool[IndexIn(pool)];

        return new string(chars);
    }
}
