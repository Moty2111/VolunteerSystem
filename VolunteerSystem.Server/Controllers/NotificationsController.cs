using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VolunteerSystem.Server.Data;

namespace VolunteerSystem.Server.Controllers;

public class NotificationDto
{
    public string Id { get; set; } = string.Empty;
    public string Kind { get; set; } = string.Empty;
    public string Text { get; set; } = string.Empty;
    public DateTime At { get; set; }
}

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class NotificationsController : ControllerBase
{
    private readonly AppDbContext _db;
    public NotificationsController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult<IEnumerable<NotificationDto>>> Get()
    {
        var list = new List<NotificationDto>();
        var isVolunteer = User.IsInRole("Волонтёр");
        var ownIdStr = User.FindFirst("VolunteerId")?.Value;

        // Волонтёр видит только свои назначения
        if (isVolunteer && ownIdStr is null)
            return Ok(list);

        var assignmentsQuery = _db.Assignments
            .Include(a => a.volunteer)
            .Include(a => a._event)
            .AsQueryable();

        if (isVolunteer)
            assignmentsQuery = assignmentsQuery.Where(a => a.volunteer_id == int.Parse(ownIdStr!));

        // Свежие назначения
        var assignments = await assignmentsQuery
            .OrderByDescending(a => a.assigned_at)
            .Take(5)
            .ToListAsync();

        foreach (var a in assignments)
        {
            list.Add(new NotificationDto
            {
                Id = $"a-{a.assignment_id}",
                Kind = a.confirmed ? "confirm" : "assignment",
                Text = isVolunteer
                    ? $"Вы назначены на «{a._event?.event_name ?? "мероприятие"}»"
                    : $"{a.volunteer?.full_name ?? "Волонтёр"} назначен на «{a._event?.event_name ?? "мероприятие"}»",
                At = a.assigned_at
            });
        }

        // Ближайшие события
        var upcoming = await _db.Events
            .Where(e => e.date_start >= DateTime.Now && e.status == "Запланировано")
            .OrderBy(e => e.date_start)
            .Take(3)
            .ToListAsync();

        foreach (var e in upcoming)
        {
            list.Add(new NotificationDto
            {
                Id = $"e-{e.event_id}",
                Kind = "event",
                Text = $"Скоро: «{e.event_name}» — {e.date_start:dd MMM}",
                At = e.created_at
            });
        }

        // Новые партнёры — только для администратора и менеджера
        if (!isVolunteer)
        {
            var partners = await _db.Partners
                .OrderByDescending(p => p.partner_id)
                .Take(2)
                .ToListAsync();

            foreach (var p in partners)
            {
                list.Add(new NotificationDto
                {
                    Id = $"p-{p.partner_id}",
                    Kind = "partner",
                    Text = $"Новый партнёр «{p.partner_name}»",
                    At = DateTime.Now.AddHours(-2)
                });
            }
        }

        return Ok(list.OrderByDescending(n => n.At).Take(10));
    }
}