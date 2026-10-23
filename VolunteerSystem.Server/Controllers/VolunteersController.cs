using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.IO;
using VolunteerSystem.Server.Data;
using VolunteerSystem.Server.Dtos.Volunteers;
using VolunteerSystem.Server.Models;
using VolunteerSystem.Server.Services;

namespace VolunteerSystem.Server.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class VolunteersController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IWebHostEnvironment _env;

    public VolunteersController(AppDbContext db, IWebHostEnvironment env)
    {
        _db = db;
        _env = env;
    }

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
            // Менеджер создал волонтёра и сразу указал дату медкнижки — считаем подтверждённой
            med_book_status = dto.MedBookValidUntil.HasValue ? "Подтверждена" : "Не загружена",
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

        // Дату медкнижки меняют только администратор/менеджер (волонтёр — через загрузку скана)
        if (isAdminOrManager)
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

    // GET: /api/volunteers/5/achievements — достижения и бейджи
    [HttpGet("{id:int}/achievements")]
    public async Task<ActionResult<AchievementsDto>> GetAchievements(int id, CancellationToken ct)
    {
        var isAdminOrManager = User.IsInRole("Администратор") || User.IsInRole("Менеджер");
        if (!isAdminOrManager && GetOwnVolunteerId() != id)
            return Forbid();

        var exists = await _db.Volunteers.AnyAsync(v => v.volunteer_id == id, ct);
        if (!exists) return NotFound(new { message = "Волонтёр не найден" });

        var assignments = await _db.Assignments
            .AsNoTracking()
            .Where(a => a.volunteer_id == id && a.confirmed)
            .Include(a => a._event)
            .ThenInclude(e => e!.event_type)
            .ToListAsync(ct);

        var skills = await _db.Volunteer_Skills
            .AsNoTracking()
            .Where(vs => vs.volunteer_id == id)
            .Select(vs => vs.skill.skill_name)
            .ToListAsync(ct);

        double hours = (double)assignments.Sum(a => a.hours_actual ?? 0);
        int eventCount = assignments.Select(a => a.event_id).Distinct().Count();
        var monthEvents = assignments.Count(a => a.assigned_at >= DateTime.Now.AddDays(-30));

        var byType = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        foreach (var a in assignments)
        {
            var type = a._event?.event_type?.type_name ?? "Прочее";
            byType[type] = byType.GetValueOrDefault(type) + 1;
        }

        var badges = new List<BadgeDto>
        {
            Make("hours-10", "10 часов", "Отработано 10 часов волонтёрской деятельности",
                hours >= 10, (int)hours, 10),
            Make("hours-50", "50 часов", "Отработано 50 часов волонтёрской деятельности",
                hours >= 50, (int)hours, 50),
            Make("hours-100", "100 часов", "Отработано 100 часов волонтёрской деятельности",
                hours >= 100, (int)hours, 100),
            Make("veteran", "Ветеран", "Участие в 10 мероприятиях (подтверждено)",
                eventCount >= 10, eventCount, 10),
            Make("month-active", "Активист месяца", "3 подтверждённых мероприятия за последние 30 дней",
                monthEvents >= 3, monthEvents, 3),
        };

        AddTypeBadge(badges, "social", "Социальный волонтёр", "Социальное", byType);
        AddTypeBadge(badges, "eco", "Экозащитник", "Экологическое", byType);
        AddTypeBadge(badges, "culture", "Культурный волонтёр", "Культурное", byType);
        AddTypeBadge(badges, "charity", "Благотворитель", "Благотворительное", byType);
        AddTypeBadge(badges, "sport", "Спортивный волонтёр", "Спортивное", byType);
        AddTypeBadge(badges, "education", "Наставник знаний", "Образовательное", byType);

        AddSkillBadge(badges, "medic", "Медик", "Первая помощь", skills);
        AddSkillBadge(badges, "driver", "Водитель-волонтёр", "Вождение автомобиля", skills);
        AddSkillBadge(badges, "organizer", "Организатор", "Организация мероприятий", skills);

        return Ok(new AchievementsDto { Badges = badges });
    }

    // === Медкнижка ===

    // POST: /api/volunteers/5/medbook — загрузка скана (волонтёр сам или админ/менеджер)
    [HttpPost("{id:int}/medbook")]
    [RequestSizeLimit(10 * 1024 * 1024)]
    public async Task<ActionResult<VolunteerDto>> UploadMedBook(int id, [FromForm] UploadMedBookDto dto, CancellationToken ct)
    {
        var isAdminOrManager = User.IsInRole("Администратор") || User.IsInRole("Менеджер");
        if (!isAdminOrManager && GetOwnVolunteerId() != id)
            return Forbid();

        var v = await _db.Volunteers.FirstOrDefaultAsync(x => x.volunteer_id == id, ct);
        if (v is null) return NotFound(new { message = "Волонтёр не найден" });

        if (dto.File is null)
            return BadRequest(new { message = "Выберите файл скана медкнижки" });

        if (!MedBookStorage.TrySaveScan(_env, dto.File, out var fileName, out var error))
            return BadRequest(new { message = error });

        // Удаляем старый скан
        if (!string.IsNullOrEmpty(v.med_book_scan_path))
        {
            var oldPath = MedBookStorage.GetFullPath(_env, v.med_book_scan_path);
            if (System.IO.File.Exists(oldPath))
            {
                try { System.IO.File.Delete(oldPath); } catch { /* не критично */ }
            }
        }

        v.med_book_scan_path = fileName;
        v.med_book_uploaded_at = DateTime.Now;
        v.med_book_status = "На проверке";
        v.med_book_verified_at = null;
        v.med_book_verified_by = null;
        v.med_book_notes = string.Empty;
        if (dto.ValidUntil is { } until)
            v.med_book_valid_until = until;

        await _db.SaveChangesAsync(ct);
        return Ok(ToDto(v));
    }

    // GET: /api/volunteers/5/medbook/scan — скачивание скана
    [HttpGet("{id:int}/medbook/scan")]
    public async Task<IActionResult> GetMedBookScan(int id, CancellationToken ct)
    {
        var isAdminOrManager = User.IsInRole("Администратор") || User.IsInRole("Менеджер");
        if (!isAdminOrManager && GetOwnVolunteerId() != id)
            return Forbid();

        var v = await _db.Volunteers.AsNoTracking()
            .FirstOrDefaultAsync(x => x.volunteer_id == id, ct);
        if (v is null) return NotFound(new { message = "Волонтёр не найден" });

        if (string.IsNullOrEmpty(v.med_book_scan_path))
            return NotFound(new { message = "Скан медкнижки не загружен" });

        var fullPath = MedBookStorage.GetFullPath(_env, v.med_book_scan_path);
        if (!System.IO.File.Exists(fullPath))
            return NotFound(new { message = "Файл скана не найден" });

        return PhysicalFile(
            fullPath,
            MedBookStorage.GetContentType(v.med_book_scan_path),
            $"medbook_{id}{Path.GetExtension(v.med_book_scan_path)}");
    }

    // POST: /api/volunteers/5/medbook/verify — решение менеджера/админа
    [HttpPost("{id:int}/medbook/verify")]
    [Authorize(Roles = "Администратор,Менеджер")]
    public async Task<ActionResult<VolunteerDto>> VerifyMedBook(int id, [FromBody] VerifyMedBookRequest dto, CancellationToken ct)
    {
        var v = await _db.Volunteers.FirstOrDefaultAsync(x => x.volunteer_id == id, ct);
        if (v is null) return NotFound(new { message = "Волонтёр не найден" });

        if (dto.ValidUntil is { } until)
            v.med_book_valid_until = until;

        if (dto.Approved)
        {
            if (v.med_book_valid_until is null)
                return BadRequest(new { message = "Укажите дату действия медкнижки" });
            if (v.med_book_valid_until.Value < DateOnly.FromDateTime(DateTime.Today))
                return BadRequest(new { message = "Дата окончания медкнижки уже в прошлом" });

            v.med_book_status = "Подтверждена";
            v.med_book_verified_at = DateTime.Now;
            v.med_book_verified_by = GetUserId();
            v.med_book_notes = string.IsNullOrWhiteSpace(dto.Comment) ? null : dto.Comment.Trim();
        }
        else
        {
            v.med_book_status = "Отклонена";
            v.med_book_verified_at = null;
            v.med_book_verified_by = null;
            v.med_book_notes = string.IsNullOrWhiteSpace(dto.Comment)
                ? "Отклонено без пояснения"
                : dto.Comment.Trim();
        }

        await _db.SaveChangesAsync(ct);
        return Ok(ToDto(v));
    }

    // === Helpers ===

    /// <summary>id волонтёра из токена; 0 — если такого claim нет или он неверен.</summary>
    private int GetOwnVolunteerId() =>
        int.TryParse(User.FindFirst("VolunteerId")?.Value, out var id) ? id : 0;

    private int? GetUserId() =>
        int.TryParse(User.FindFirst("UserId")?.Value, out var id) ? id : null;

    private static BadgeDto Make(string code, string title, string description,
        bool earned, int current, int target) => new()
    {
        Code = code,
        Title = title,
        Description = description,
        Earned = earned,
        Current = current,
        Target = target,
        Progress = Math.Clamp((double)current / target, 0, 1)
    };

    private static void AddTypeBadge(List<BadgeDto> badges, string code, string title,
        string typeName, Dictionary<string, int> byType)
    {
        var count = byType.GetValueOrDefault(typeName);
        badges.Add(new BadgeDto
        {
            Code = code,
            Title = title,
            Description = $"Подтверждённое участие в мероприятиях «{typeName}» (5)",
            Earned = count >= 5,
            Current = count,
            Target = 5,
            Progress = Math.Clamp((double)count / 5, 0, 1)
        });
    }

    private static void AddSkillBadge(List<BadgeDto> badges, string code, string title,
        string skillName, List<string> skills)
    {
        var has = skills.Contains(skillName, StringComparer.OrdinalIgnoreCase);
        badges.Add(new BadgeDto
        {
            Code = code,
            Title = title,
            Description = $"Навык «{skillName}» в профиле",
            Earned = has,
            Current = has ? 1 : 0,
            Target = 1,
            Progress = has ? 1 : 0
        });
    }

    private static VolunteerDto ToDto(Volunteer v) => new()
    {
        VolunteerId = v.volunteer_id,
        FullName = v.full_name,
        BirthDate = v.birth_date,
        Phone = v.phone,
        Email = v.email,
        City = v.city,
        MedBookValidUntil = v.med_book_valid_until,
        MedBookStatus = v.med_book_status,
        MedBookScanPath = v.med_book_scan_path,
        MedBookUploadedAt = v.med_book_uploaded_at,
        MedBookVerifiedAt = v.med_book_verified_at,
        MedBookComment = v.med_book_notes,
        PersonalDataConsent = v.personal_data_consent,
        IsActive = v.is_active,
        CreatedAt = v.created_at
    };
}
