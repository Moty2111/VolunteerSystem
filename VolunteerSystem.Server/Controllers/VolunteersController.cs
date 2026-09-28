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

    // GET: /api/volunteers?city=Москва&active=true
    [HttpGet]
    [Authorize(Roles = "Администратор,Менеджер")]
    public async Task<ActionResult<IEnumerable<VolunteerDto>>> GetAll(
        [FromQuery] string? city,
        [FromQuery] bool? active)
    {
        var query = _db.Volunteers.AsQueryable();

        if (!string.IsNullOrWhiteSpace(city))
            query = query.Where(v => v.city.Contains(city));

        if (active.HasValue)
            query = query.Where(v => v.is_active == active.Value);

        var result = await query
            .OrderBy(v => v.full_name)
            .Select(v => ToDto(v))
            .ToListAsync();

        return Ok(result);
    }

    // GET: /api/volunteers/5
    [HttpGet("{id:int}")]
    public async Task<ActionResult<VolunteerDto>> GetById(int id)
    {
        // Волонтёр может смотреть только свой профиль
        if (User.IsInRole("Волонтёр"))
        {
            var ownId = User.FindFirst("VolunteerId")?.Value;
            if (ownId is null || int.Parse(ownId) != id)
                return Forbid();
        }

        var v = await _db.Volunteers.FindAsync(id);
        if (v is null) return NotFound();

        return Ok(ToDto(v));
    }

    // POST: /api/volunteers
    [HttpPost]
    [Authorize(Roles = "Администратор,Менеджер")]
    public async Task<ActionResult<VolunteerDto>> Create([FromBody] CreateVolunteerDto dto)
    {
        if (await _db.Volunteers.AnyAsync(v => v.email == dto.Email))
            return Conflict(new { message = "Email уже используется" });

        var v = new Volunteer
        {
            full_name = dto.FullName,
            birth_date = dto.BirthDate,
            phone = dto.Phone,
            email = dto.Email,
            city = dto.City,
            med_book_valid_until = dto.MedBookValidUntil,
            personal_data_consent = dto.PersonalDataConsent,
            is_active = true,
            created_at = DateTime.Now
        };

        _db.Volunteers.Add(v);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = v.volunteer_id }, ToDto(v));
    }

    // PUT: /api/volunteers/5
    // Редактирование: админ/менеджер — любого, волонтёр — только себя
    [HttpPut("{id:int}")]
    [Authorize]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateVolunteerDto dto)
    {
        var isAdminOrManager = User.IsInRole("Администратор") || User.IsInRole("Менеджер");

        if (!isAdminOrManager)
        {
            var ownId = User.FindFirst("VolunteerId")?.Value;
            if (ownId is null || int.Parse(ownId) != id)
                return Forbid();
        }

        var v = await _db.Volunteers.FindAsync(id);
        if (v is null) return NotFound();

        if (!string.IsNullOrWhiteSpace(dto.Email) &&
            !string.Equals(v.email, dto.Email, StringComparison.OrdinalIgnoreCase) &&
            await _db.Volunteers.AnyAsync(x => x.email == dto.Email))
            return Conflict(new { message = "Email уже используется" });

        v.full_name = dto.FullName;
        v.phone = dto.Phone;
        if (!string.IsNullOrWhiteSpace(dto.Email))
            v.email = dto.Email.Trim();
        v.city = dto.City;
        v.med_book_valid_until = dto.MedBookValidUntil;

        // Статус активности меняют только администратор и менеджер
        if (isAdminOrManager)
            v.is_active = dto.IsActive;

        await _db.SaveChangesAsync();
        return NoContent();
    }

    // DELETE: /api/volunteers/5 (анонимизация, чтобы не терять отчётность)
    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Администратор")]
    public async Task<IActionResult> Delete(int id)
    {
        var v = await _db.Volunteers.FindAsync(id);
        if (v is null) return NotFound();

        v.full_name = "Анонимный волонтёр #" + id;
        v.phone = "-";
        v.email = $"deleted_{id}@anon.local";
        v.is_active = false;

        await _db.SaveChangesAsync();
        return NoContent();
    }

    // === Helpers ===
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