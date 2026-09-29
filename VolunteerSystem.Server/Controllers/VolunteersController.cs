using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VolunteerSystem.Server.Data;
using VolunteerSystem.Server.Dtos.Volunteers;
using VolunteerSystem.Server.Models;

namespace VolunteerSystem.Server.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class VolunteersController : ControllerBase
{
    private readonly AppDbContext _db;

    public VolunteersController(AppDbContext db) => _db = db;

    // GET: /api/volunteers?city=Москва&active=true&search=иванов
    [HttpGet]
    [Authorize(Roles = "Администратор,Менеджер")]
    public async Task<ActionResult<IEnumerable<VolunteerDto>>> GetAll(
        [FromQuery] string? city,
        [FromQuery] bool? active,
        [FromQuery] string? search,
        CancellationToken ct)
    {
        var query = _db.Volunteers.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(city))
        {
            var pattern = city.Trim();
            query = query.Where(v => v.city.Contains(pattern));
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var pattern = search.Trim();
            query = query.Where(v =>
                v.full_name.Contains(pattern) ||
                v.email.Contains(pattern) ||
                v.city.Contains(pattern));
        }

        if (active.HasValue)
            query = query.Where(v => v.is_active == active.Value);

        var result = await query
            .OrderBy(v => v.full_name)
            .Select(v => ToDto(v))
            .ToListAsync(ct);

        return Ok(result);
    }

    // GET: /api/volunteers/5
    [HttpGet("{id:int}")]
    public async Task<ActionResult<VolunteerDto>> GetById(int id, CancellationToken ct)
    {
        // Волонтёр может смотреть только свой профиль
        if (User.IsInRole("Волонтёр") && GetOwnVolunteerId() != id)
            return Forbid();

        var v = await _db.Volunteers.AsNoTracking()
            .FirstOrDefaultAsync(x => x.volunteer_id == id, ct);

        if (v is null) return NotFound(new { message = "Волонтёр не найден" });
        return Ok(ToDto(v));
    }

    // POST: /api/volunteers
    [HttpPost]
    [Authorize(Roles = "Администратор,Менеджер")]
    public async Task<ActionResult<VolunteerDto>> Create([FromBody] CreateVolunteerDto dto, CancellationToken ct)
    {
        var email = dto.Email.Trim();
        if (await _db.Volunteers.AnyAsync(v => v.email == email, ct))
            return Conflict(new { message = "Email уже используется" });

        var v = new Volunteer
        {
            full_name = dto.FullName.Trim(),
            birth_date = dto.BirthDate,
            phone = dto.Phone.Trim(),
            email = email,
            city = dto.City.Trim(),
            med_book_valid_until = dto.MedBookValidUntil,
            personal_data_consent = dto.PersonalDataConsent,
            is_active = true,
            created_at = DateTime.Now
        };

        _db.Volunteers.Add(v);
        await _db.SaveChangesAsync(ct);

        return CreatedAtAction(nameof(GetById), new { id = v.volunteer_id }, ToDto(v));
    }

    // PUT: /api/volunteers/5
    // Редактирование: админ/менеджер — любого, волонтёр — только себя
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateVolunteerDto dto, CancellationToken ct)
    {
        var isAdminOrManager = User.IsInRole("Администратор") || User.IsInRole("Менеджер");

        if (!isAdminOrManager && GetOwnVolunteerId() != id)
            return Forbid();

        var v = await _db.Volunteers.FirstOrDefaultAsync(x => x.volunteer_id == id, ct);
        if (v is null) return NotFound(new { message = "Волонтёр не найден" });

        if (!string.IsNullOrWhiteSpace(dto.Email))
        {
            var email = dto.Email.Trim();
            if (!string.Equals(v.email, email, StringComparison.OrdinalIgnoreCase) &&
                await _db.Volunteers.AnyAsync(x => x.email == email && x.volunteer_id != id, ct))
                return Conflict(new { message = "Email уже используется" });

            v.email = email;
        }

        v.full_name = dto.FullName.Trim();
        v.phone = dto.Phone.Trim();
        v.city = dto.City.Trim();
        v.med_book_valid_until = dto.MedBookValidUntil;

        // Статус активности меняют только администратор и менеджер
        if (isAdminOrManager)
            v.is_active = dto.IsActive;

        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    // DELETE: /api/volunteers/5 (анонимизация, чтобы не терять отчётность)
    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Администратор")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var v = await _db.Volunteers.FirstOrDefaultAsync(x => x.volunteer_id == id, ct);
        if (v is null) return NotFound(new { message = "Волонтёр не найден" });

        v.full_name = "Анонимный волонтёр #" + id;
        v.phone = "-";
        v.email = $"deleted_{id}@anon.local";
        v.is_active = false;

        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    // === Helpers ===

    /// <summary>id волонтёра из токена; 0 — если такого claim нет или он неверен.</summary>
    private int GetOwnVolunteerId() =>
        int.TryParse(User.FindFirst("VolunteerId")?.Value, out var id) ? id : 0;

    private static VolunteerDto ToDto(Volunteer v) => new()
    {
        VolunteerId = v.volunteer_id,
        FullName = v.full_name,
        BirthDate = v.birth_date,
        Phone = v.phone,
        Email = v.email,
        City = v.city,
        MedBookValidUntil = v.med_book_valid_until,
        PersonalDataConsent = v.personal_data_consent,
        IsActive = v.is_active,
        CreatedAt = v.created_at
    };
}
