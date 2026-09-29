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
    private readonly AppDbContext _db;
    private readonly ILogger<EventsController> _logger;

    public EventsController(AppDbContext db, ILogger<EventsController> logger)
    {
        _db = db;
        _logger = logger;
    }

    // ============================================================
    // GET: /api/events?status=Запланировано&typeId=2&from=2026-01-01&to=2026-12-31
    // Список мероприятий открыт: его видит и волонтёр (для самостоятельной записи)
    // ============================================================
    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<IEnumerable<EventDto>>> GetAll(
        [FromQuery] string? status,
        [FromQuery] int? typeId,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] string? search,
        CancellationToken ct)
    {
        var query = _db.Events
            .AsNoTracking()
            .Include(e => e.event_type)
            .Include(e => e.coordinator)
            .Include(e => e.Assignments)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(status))
        {
            var s = status.Trim();
            query = query.Where(e => e.status == s);
        }

        if (typeId.HasValue)
            query = query.Where(e => e.event_type_id == typeId.Value);

        if (from.HasValue)
            query = query.Where(e => e.date_start >= from.Value);

        if (to.HasValue)
            query = query.Where(e => e.date_end <= to.Value);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var pattern = search.Trim();
            query = query.Where(e => e.event_name.Contains(pattern) || e.location.Contains(pattern));
        }

        var result = await query
            .OrderByDescending(e => e.date_start)
            .Select(e => ToDto(e))
            .ToListAsync(ct);

        return Ok(result);
    }

    // ============================================================
    // GET: /api/events/5
    // ============================================================
    [HttpGet("{id:int}")]
    [AllowAnonymous]
    public async Task<ActionResult<EventDto>> GetById(int id, CancellationToken ct)
    {
        var e = await _db.Events
            .AsNoTracking()
            .Include(x => x.event_type)
            .Include(x => x.coordinator)
            .Include(x => x.Assignments)
            .FirstOrDefaultAsync(x => x.event_id == id, ct);

        if (e is null) return NotFound(new { message = "Мероприятие не найдено" });
        return Ok(ToDto(e));
    }

    // ============================================================
    // POST: /api/events
    // ============================================================
    [HttpPost]
    [Authorize(Roles = "Администратор,Менеджер")]
    public async Task<ActionResult<EventDto>> Create([FromBody] CreateEventDto dto, CancellationToken ct)
    {
        // корректность дат и статуса проверит модель (DataAnnotations + IValidatableObject)

        if (dto.DateStart < DateTime.Now && !User.IsInRole("Администратор"))
            return BadRequest(new { message = "Дата начала не может быть в прошлом" });

        if (!await _db.EventTypes.AnyAsync(t => t.event_type_id == dto.EventTypeId, ct))
            return BadRequest(new { message = "Указанный тип мероприятия не найден" });

        if (!int.TryParse(User.FindFirst("UserId")?.Value, out var userId))
            return Unauthorized();

        var ev = new Event
        {
            event_name = dto.EventName.Trim(),
            date_start = dto.DateStart,
            date_end = dto.DateEnd,
            location = dto.Location.Trim(),
            event_type_id = dto.EventTypeId,
            description = dto.Description?.Trim(),
            status = dto.Status,
            coordinator_id = userId,
            created_at = DateTime.Now
        };

        _db.Events.Add(ev);
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation("Создано мероприятие {Name} (id {Id}) координатором {UserId}",
            ev.event_name, ev.event_id, userId);

        return await GetById(ev.event_id, ct);
    }

    // ============================================================
    // PUT: /api/events/5
    // ============================================================
    [HttpPut("{id:int}")]
    [Authorize(Roles = "Администратор,Менеджер")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateEventDto dto, CancellationToken ct)
    {
        var ev = await _db.Events.FirstOrDefaultAsync(x => x.event_id == id, ct);
        if (ev is null) return NotFound(new { message = "Мероприятие не найдено" });

        // Менеджер правит только свои мероприятия
        if (User.IsInRole("Менеджер"))
        {
            if (!int.TryParse(User.FindFirst("UserId")?.Value, out var userId) || ev.coordinator_id != userId)
                return Forbid();
        }

        if (!await _db.EventTypes.AnyAsync(t => t.event_type_id == dto.EventTypeId, ct))
            return BadRequest(new { message = "Указанный тип мероприятия не найден" });

        ev.event_name = dto.EventName.Trim();
        ev.date_start = dto.DateStart;
        ev.date_end = dto.DateEnd;
        ev.location = dto.Location.Trim();
        ev.event_type_id = dto.EventTypeId;
        ev.description = dto.Description?.Trim();
        ev.status = dto.Status;

        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    // ============================================================
    // DELETE: /api/events/5
    // ============================================================
    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Администратор")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var ev = await _db.Events.FirstOrDefaultAsync(x => x.event_id == id, ct);
        if (ev is null) return NotFound(new { message = "Мероприятие не найдено" });

        if (ev.status == EventStatuses.Finished)
            return BadRequest(new { message = "Нельзя удалить завершённое мероприятие" });

        _db.Events.Remove(ev);
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation("Удалено мероприятие id {Id}", id);
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
