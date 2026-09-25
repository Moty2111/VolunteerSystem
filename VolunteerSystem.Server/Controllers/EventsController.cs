using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VolunteerSystem.Server.Data;
using VolunteerSystem.Server.Dtos.Events;
using VolunteerSystem.Server.Models;

namespace VolunteerSystem.Server.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class EventsController : ControllerBase
{
    private static readonly string[] AllowedStatuses =
        { "Запланировано", "Идёт", "Завершено", "Отменено" };

    private readonly AppDbContext _db;

    public EventsController(AppDbContext db) => _db = db;

    // ============================================================
    // GET: /api/events?status=Запланировано&typeId=2&from=2026-01-01&to=2026-12-31
    // ============================================================
    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<IEnumerable<EventDto>>> GetAll(
        [FromQuery] string? status,
        [FromQuery] int? typeId,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] string? search)
    {
        var query = _db.Events
            .Include(e => e.event_type)
            .Include(e => e.coordinator)
            .Include(e => e.Assignments)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(e => e.status == status);

        if (typeId.HasValue)
            query = query.Where(e => e.event_type_id == typeId.Value);

        if (from.HasValue)
            query = query.Where(e => e.date_start >= from.Value);

        if (to.HasValue)
            query = query.Where(e => e.date_end <= to.Value);

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(e => e.event_name.Contains(search));

        var result = await query
            .OrderByDescending(e => e.date_start)
            .Select(e => ToDto(e))
            .ToListAsync();

        return Ok(result);
    }

    // ============================================================
    // GET: /api/events/5
    // ============================================================
    [HttpGet("{id:int}")]
    [AllowAnonymous]
    public async Task<ActionResult<EventDto>> GetById(int id)
    {
        var e = await _db.Events
            .Include(x => x.event_type)
            .Include(x => x.coordinator)
            .Include(x => x.Assignments)
            .FirstOrDefaultAsync(x => x.event_id == id);

        if (e is null) return NotFound();
        return Ok(ToDto(e));
    }

    // ============================================================
    // POST: /api/events
    // ============================================================
    [HttpPost]
    [Authorize(Roles = "Администратор,Менеджер")]
    public async Task<ActionResult<EventDto>> Create([FromBody] CreateEventDto dto)
    {
        if (dto.DateEnd <= dto.DateStart)
            return BadRequest(new { message = "Дата окончания должна быть позже даты начала" });

        if (!AllowedStatuses.Contains(dto.Status))
            return BadRequest(new { message = "Недопустимый статус" });

        if (dto.DateStart < DateTime.Now && !User.IsInRole("Администратор"))
            return BadRequest(new { message = "Дата начала не может быть в прошлом" });

        if (!await _db.EventTypes.AnyAsync(t => t.event_type_id == dto.EventTypeId))
            return BadRequest(new { message = "Указанный тип мероприятия не найден" });

        var userIdClaim = User.FindFirst("UserId")?.Value;
        if (userIdClaim is null) return Unauthorized();

        var ev = new Event
        {
            event_name = dto.EventName,
            date_start = dto.DateStart,
            date_end = dto.DateEnd,
            location = dto.Location,
            event_type_id = dto.EventTypeId,
            description = dto.Description,
            status = dto.Status,
            coordinator_id = int.Parse(userIdClaim),
            created_at = DateTime.Now
        };

        _db.Events.Add(ev);
        await _db.SaveChangesAsync();

        return await GetById(ev.event_id);
    }

    // ============================================================
    // PUT: /api/events/5
    // ============================================================
    [HttpPut("{id:int}")]
    [Authorize(Roles = "Администратор,Менеджер")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateEventDto dto)
    {
        var ev = await _db.Events.FindAsync(id);
        if (ev is null) return NotFound();

        // Менеджер правит только свои мероприятия
        if (User.IsInRole("Менеджер"))
        {
            var userId = int.Parse(User.FindFirst("UserId")!.Value);
            if (ev.coordinator_id != userId)
                return Forbid();
        }

        if (dto.DateEnd <= dto.DateStart)
            return BadRequest(new { message = "Дата окончания должна быть позже даты начала" });

        if (!AllowedStatuses.Contains(dto.Status))
            return BadRequest(new { message = "Недопустимый статус" });

        ev.event_name = dto.EventName;
        ev.date_start = dto.DateStart;
        ev.date_end = dto.DateEnd;
        ev.location = dto.Location;
        ev.event_type_id = dto.EventTypeId;
        ev.description = dto.Description;
        ev.status = dto.Status;

        await _db.SaveChangesAsync();
        return NoContent();
    }

    // ============================================================
    // DELETE: /api/events/5
    // ============================================================
    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Администратор")]
    public async Task<IActionResult> Delete(int id)
    {
        var ev = await _db.Events.FindAsync(id);
        if (ev is null) return NotFound();

        if (ev.status == "Завершено")
            return BadRequest(new { message = "Нельзя удалить завершённое мероприятие" });

        _db.Events.Remove(ev);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // ============================================================
    // Helpers
    // ============================================================
    private static EventDto ToDto(Event e) => new()
    {
        EventId = e.event_id,
        EventName = e.event_name,
        DateStart = e.date_start,
        DateEnd = e.date_end,
        Location = e.location,
        EventTypeId = e.event_type_id,
        EventTypeName = e.event_type?.type_name,
        Description = e.description,
        Status = e.status,
        CoordinatorId = e.coordinator_id,
        CoordinatorName = e.coordinator?.login_name,
        CreatedAt = e.created_at,
        AssignmentsCount = e.Assignments?.Count ?? 0
    };
}