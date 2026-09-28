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
    private static readonly string[] AllowedRoles =
        { "Администратор", "Менеджер", "Волонтёр" };

    private readonly AppDbContext _db;

    public UsersController(AppDbContext db) => _db = db;

    // GET: /api/users — список учётных записей (без паролей)
    [HttpGet]
    [Authorize(Roles = "Администратор")]
    public async Task<ActionResult<IEnumerable<SystemUserDto>>> GetAll()
    {
        var list = await _db.SystemUsers
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
            .ToListAsync();

        return Ok(list);
    }

    // PUT: /api/users/5/role — смена роли (нельзя менять свою)
    [HttpPut("{id:int}/role")]
    [Authorize(Roles = "Администратор")]
    public async Task<IActionResult> UpdateRole(int id, [FromBody] UpdateUserRoleDto dto)
    {
        if (!AllowedRoles.Contains(dto.Role))
            return BadRequest(new { message = "Недопустимая роль" });

        var currentId = User.FindFirst("UserId")?.Value;
        if (currentId is not null && int.Parse(currentId) == id)
            return BadRequest(new { message = "Нельзя менять роль собственной учётной записи" });

        var user = await _db.SystemUsers.FindAsync(id);
        if (user is null) return NotFound();

        user.system_role = dto.Role;
        await _db.SaveChangesAsync();

        return NoContent();
    }

    // PUT: /api/users/5/active — включение/отключение (нельзя отключить себя)
    [HttpPut("{id:int}/active")]
    [Authorize(Roles = "Администратор")]
    public async Task<IActionResult> UpdateActive(int id, [FromBody] UpdateUserActiveDto dto)
    {
        var currentId = User.FindFirst("UserId")?.Value;
        if (currentId is not null && int.Parse(currentId) == id && !dto.IsActive)
            return BadRequest(new { message = "Нельзя отключить собственную учётную запись" });

        var user = await _db.SystemUsers.FindAsync(id);
        if (user is null) return NotFound();

        user.is_active = dto.IsActive;
        await _db.SaveChangesAsync();

        return NoContent();
    }
}
