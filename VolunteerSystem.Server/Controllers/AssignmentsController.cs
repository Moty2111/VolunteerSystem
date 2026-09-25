using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using VolunteerSystem.Server.Data;
using VolunteerSystem.Server.Dtos.Assignments;
using VolunteerSystem.Server.Models;

namespace VolunteerSystem.Server.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AssignmentsController : ControllerBase
{
    private readonly AppDbContext _db;

    public AssignmentsController(AppDbContext db) => _db = db;

    // ============================================================
    // GET: /api/assignments?volunteerId=1&eventId=2&confirmed=true
    // ============================================================
    [HttpGet]
    [Authorize(Roles = "Администратор,Менеджер")]
    public async Task<ActionResult<IEnumerable<AssignmentDto>>> GetAll(
        [FromQuery] int? volunteerId,
        [FromQuery] int? eventId,
        [FromQuery] bool? confirmed)
    {
        var query = _db.Assignments
            .Include(a => a.volunteer)
            .Include(a => a._event)   // <-- вот здесь: _event, а не event
            .Include(a => a.role)
            .AsQueryable();

        if (volunteerId.HasValue)
            query = query.Where(a => a.volunteer_id == volunteerId.Value);

        if (eventId.HasValue)
            query = query.Where(a => a.event_id == eventId.Value);

        if (confirmed.HasValue)
            query = query.Where(a => a.confirmed == confirmed.Value);

        var list = await query
            .OrderByDescending(a => a.assigned_at)
            .Select(a => ToDto(a))
            .ToListAsync();

        return Ok(list);
    }

    // ============================================================
    // GET: /api/assignments/my
    // ============================================================
    [HttpGet("my")]
    public async Task<ActionResult<IEnumerable<AssignmentDto>>> My()
    {
        var volunteerIdClaim = User.FindFirst("VolunteerId")?.Value;
        if (volunteerIdClaim is null) return Forbid();

        var vId = int.Parse(volunteerIdClaim);

        var list = await _db.Assignments
            .Include(a => a.volunteer)
            .Include(a => a._event)
            .Include(a => a.role)
            .Where(a => a.volunteer_id == vId)
            .OrderByDescending(a => a.assigned_at)
            .Select(a => ToDto(a))
            .ToListAsync();

        return Ok(list);
    }

    // ============================================================
    // GET: /api/assignments/5
    // ============================================================
    [HttpGet("{id:int}")]
    [Authorize(Roles = "Администратор,Менеджер")]
    public async Task<ActionResult<AssignmentDto>> GetById(int id)
    {
        var a = await _db.Assignments
            .Include(x => x.volunteer)
            .Include(x => x._event)
            .Include(x => x.role)
            .FirstOrDefaultAsync(x => x.assignment_id == id);

        if (a is null) return NotFound();
        return Ok(ToDto(a));
    }

    // ============================================================
    // POST: /api/assignments
    // ============================================================
    [HttpPost]
    [Authorize(Roles = "Администратор,Менеджер")]
    public async Task<ActionResult<AssignmentDto>> Create([FromBody] CreateAssignmentDto dto)
    {
        if (!await _db.Volunteers.AnyAsync(v => v.volunteer_id == dto.VolunteerId))
            return BadRequest(new { message = "Волонтёр не найден" });

        if (!await _db.Events.AnyAsync(e => e.event_id == dto.EventId))
            return BadRequest(new { message = "Мероприятие не найдено" });

        if (!await _db.Roles.AnyAsync(r => r.role_id == dto.RoleId))
            return BadRequest(new { message = "Роль не найдена" });

        var a = new Assignment
        {
            volunteer_id = dto.VolunteerId,
            event_id = dto.EventId,
            role_id = dto.RoleId,
            confirmed = false,
            assigned_at = DateTime.Now
        };

        _db.Assignments.Add(a);

        try
        {
            await _db.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (ex.InnerException is SqlException sql)
        {
            // Сообщения из триггеров БД (RAISERROR) возвращаем клиенту
            return BadRequest(new { message = sql.Message });
        }

        return await GetById(a.assignment_id);
    }

    // ============================================================
    // PUT: /api/assignments/5
    // ============================================================
    [HttpPut("{id:int}")]
    [Authorize(Roles = "Администратор,Менеджер")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateAssignmentDto dto)
    {
        var a = await _db.Assignments.FindAsync(id);
        if (a is null) return NotFound();

        a.hours_actual = dto.HoursActual;
        a.confirmed = dto.Confirmed;

        try
        {
            await _db.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (ex.InnerException is SqlException sql)
        {
            return BadRequest(new { message = sql.Message });
        }

        return NoContent();
    }

    // ============================================================
    // DELETE: /api/assignments/5
    // ============================================================
    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Администратор,Менеджер")]
    public async Task<IActionResult> Delete(int id)
    {
        var a = await _db.Assignments.FindAsync(id);
        if (a is null) return NotFound();

        _db.Assignments.Remove(a);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // ============================================================
    // Helpers
    // ============================================================
    private static AssignmentDto ToDto(Assignment a) => new()
    {
        AssignmentId = a.assignment_id,
        VolunteerId = a.volunteer_id,
        VolunteerName = a.volunteer?.full_name ?? string.Empty,
        EventId = a.event_id,
        EventName = a._event?.event_name ?? string.Empty,
        EventDateStart = a._event?.date_start ?? default,
        EventDateEnd = a._event?.date_end ?? default,
        RoleId = a.role_id,
        RoleName = a.role?.role_name,
        HoursActual = a.hours_actual,
        Confirmed = a.confirmed,
        AssignedAt = a.assigned_at
    };
}