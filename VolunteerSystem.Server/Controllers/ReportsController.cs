using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VolunteerSystem.Server.Data;
using VolunteerSystem.Server.Dtos.Reports;

namespace VolunteerSystem.Server.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Администратор,Менеджер")]
public class ReportsController : ControllerBase
{
    private readonly AppDbContext _db;

    public ReportsController(AppDbContext db) => _db = db;

    // ============================================================
    // GET: /api/reports/volunteer-summary — сводка по волонтёрам
    // ============================================================
    [HttpGet("volunteer-summary")]
    public async Task<ActionResult<IEnumerable<VolunteerSummaryRow>>> VolunteerSummary(CancellationToken ct)
    {
        var rows = await _db.Database
            .SqlQueryRaw<VolunteerSummaryRow>("SELECT * FROM vw_VolunteerSummary")
            .ToListAsync(ct);

        return Ok(rows);
    }

    // ============================================================
    // GET: /api/reports/event-participants/2 — участники мероприятия
    // ============================================================
    [HttpGet("event-participants/{eventId:int}")]
    public async Task<ActionResult<IEnumerable<EventParticipantRow>>> EventParticipants(
        int eventId, CancellationToken ct)
    {
        var rows = await _db.Database
            .SqlQueryRaw<EventParticipantRow>(
                "SELECT * FROM vw_EventParticipants WHERE event_id = {0}", eventId)
            .ToListAsync(ct);

        return Ok(rows);
    }

    // ============================================================
    // GET: /api/reports/partner-report — партнёрский отчёт
    // ============================================================
    [HttpGet("partner-report")]
    public async Task<ActionResult<IEnumerable<PartnerReportRow>>> PartnerReport(CancellationToken ct)
    {
        var rows = await _db.Database
            .SqlQueryRaw<PartnerReportRow>("SELECT * FROM vw_PartnerReport")
            .ToListAsync(ct);

        return Ok(rows);
    }

    // ============================================================
    // GET: /api/reports/hours?from=2026-01-01&to=2026-12-31
    // Использует хранимую процедуру sp_HoursReport
    // ============================================================
    [HttpGet("hours")]
    public async Task<ActionResult<IEnumerable<HoursByPeriodRow>>> HoursByPeriod(
        [FromQuery] DateTime from,
        [FromQuery] DateTime to,
        CancellationToken ct)
    {
        if (to < from)
            return BadRequest(new { message = "Период «до» не может быть раньше периода «с»" });

        // разумный потолок, чтобы случайный from=0001 не гонял всю таблицу
        var fromDate = from == default ? DateTime.Today.AddYears(-1) : from.Date;
        var toDate = to == default ? DateTime.Today : to.Date;

        var rows = await _db.Database
            .SqlQueryRaw<HoursByPeriodRow>(
                "EXEC sp_HoursReport @date_from = {0}, @date_to = {1}", fromDate, toDate)
            .ToListAsync(ct);

        return Ok(rows);
    }

    // ============================================================
    // GET: /api/reports/volunteer-rating — рейтинг волонтёров
    // Использует хранимую процедуру sp_VolunteerRating
    // ============================================================
    [HttpGet("volunteer-rating")]
    public async Task<ActionResult<IEnumerable<VolunteerRatingRow>>> VolunteerRating(CancellationToken ct)
    {
        var rows = await _db.Database
            .SqlQueryRaw<VolunteerRatingRow>("EXEC sp_VolunteerRating")
            .ToListAsync(ct);

        return Ok(rows);
    }

    // ============================================================
    // GET: /api/reports/audit-log?limit=100 — журнал аудита
    // ============================================================
    [HttpGet("audit-log")]
    [Authorize(Roles = "Администратор")]
    public async Task<IActionResult> AuditLog([FromQuery] int limit = 100, CancellationToken ct = default)
    {
        // limit защищён и сверху, и снизу: иначе ?limit=999999 утащит всё
        var take = Math.Clamp(limit, 1, 1000);

        var rows = await _db.AuditLogs
            .AsNoTracking()
            .OrderByDescending(l => l.action_date)
            .Take(take)
            .Select(l => new
            {
                l.log_id,
                l.user_id,
                l.action,
                l.table_name,
                l.record_id,
                l.action_date
            })
            .ToListAsync(ct);

        return Ok(rows);
    }
}
