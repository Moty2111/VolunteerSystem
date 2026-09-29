using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VolunteerSystem.Server.Data;
using VolunteerSystem.Server.Dtos.Skills;
using VolunteerSystem.Server.Models;

namespace VolunteerSystem.Server.Controllers;

/// <summary>Допустимые уровни навыка — единый список для клиента и сервера.</summary>
public static class SkillLevels
{
    public const string Beginner = "Начальный";
    public const string Intermediate = "Средний";
    public const string Professional = "Профессиональный";

    public static readonly string[] All =
        [Beginner, Intermediate, Professional, "A1", "A2", "B1", "B2", "C1", "C2"];

    /// <summary>Уровни, применимые к обычным навыкам (не к языкам).</summary>
    public static readonly string[] General = [Beginner, Intermediate, Professional];

    /// <summary>Регулярное выражение для атрибута (должно быть константой).</summary>
    public const string AllowedPattern = @"^(Начальный|Средний|Профессиональный|A1|A2|B1|B2|C1|C2)$";
}

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SkillsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ILogger<SkillsController> _logger;

    public SkillsController(AppDbContext db, ILogger<SkillsController> logger)
    {
        _db = db;
        _logger = logger;
    }

    // GET: /api/skills
    [HttpGet]
    public async Task<ActionResult<IEnumerable<SkillDto>>> GetAll(CancellationToken ct)
    {
        // проекция сразу в DTO: данные не материализуются в сущности
        var list = await _db.Skills
            .AsNoTracking()
            .Select(s => new SkillDto
            {
                SkillId = s.skill_id,
                SkillName = s.skill_name,
                Level = s.level,
                AssignedCount = s.Volunteer_Skills.Count
            })
            .OrderBy(s => s.SkillName)
            .ToListAsync(ct);

        return Ok(list);
    }

    // POST: /api/skills
    [HttpPost]
    [Authorize(Roles = "Администратор,Менеджер")]
    public async Task<ActionResult<SkillDto>> Create([FromBody] CreateSkillDto dto, CancellationToken ct)
    {
        if (!SkillLevels.All.Contains(dto.Level))
            return BadRequest(new { message = "Недопустимый уровень" });

        var name = dto.SkillName.Trim();
        if (await _db.Skills.AnyAsync(s => s.skill_name == name, ct))
            return Conflict(new { message = "Такой навык уже есть в каталоге" });

        var skill = new Skill { skill_name = name, level = dto.Level };
        _db.Skills.Add(skill);
        await _db.SaveChangesAsync(ct);

        return Ok(new SkillDto
        {
            SkillId = skill.skill_id,
            SkillName = skill.skill_name,
            Level = skill.level,
            AssignedCount = 0
        });
    }

    // DELETE: /api/skills/5
    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Администратор")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var skill = await _db.Skills.FindAsync([id], ct);
        if (skill is null) return NotFound(new { message = "Навык не найден" });

        _db.Skills.Remove(skill);
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation("Удалён навык {Name} (id {Id})", skill.skill_name, id);
        return NoContent();
    }

    // GET: /api/skills/volunteer/1 — навыки волонтёра
    [HttpGet("volunteer/{volunteerId:int}")]
    public async Task<ActionResult<IEnumerable<VolunteerSkillDto>>> GetVolunteerSkills(
        int volunteerId, CancellationToken ct)
    {
        // Волонтёр видит только свои навыки
        if (User.IsInRole("Волонтёр") &&
            (!int.TryParse(User.FindFirst("VolunteerId")?.Value, out var own) || own != volunteerId))
            return Forbid();

        var list = await _db.Volunteer_Skills
            .AsNoTracking()
            .Where(vs => vs.volunteer_id == volunteerId)
            .Select(vs => new VolunteerSkillDto
            {
                SkillId = vs.skill_id,
                SkillName = vs.skill.skill_name,
                Level = vs.skill.level,
                YearConfirmed = vs.year_confirmed
            })
            .OrderBy(vs => vs.SkillName)
            .ToListAsync(ct);

        return Ok(list);
    }

    // POST: /api/skills/volunteer/1 — назначить навык волонтёру
    [HttpPost("volunteer/{volunteerId:int}")]
    [Authorize(Roles = "Администратор,Менеджер")]
    public async Task<IActionResult> AssignSkill(
        int volunteerId, [FromBody] AssignSkillDto dto, CancellationToken ct)
    {
        if (!await _db.Volunteers.AnyAsync(v => v.volunteer_id == volunteerId, ct))
            return NotFound(new { message = "Волонтёр не найден" });

        if (!await _db.Skills.AnyAsync(s => s.skill_id == dto.SkillId, ct))
            return NotFound(new { message = "Навык не найден" });

        if (await _db.Volunteer_Skills.AnyAsync(vs =>
                vs.volunteer_id == volunteerId && vs.skill_id == dto.SkillId, ct))
            return Conflict(new { message = "Этот навык уже назначен" });

        _db.Volunteer_Skills.Add(new Volunteer_Skill
        {
            volunteer_id = volunteerId,
            skill_id = dto.SkillId,
            year_confirmed = dto.YearConfirmed
        });

        try
        {
            await _db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException)
        {
            return Conflict(new { message = "Этот навык уже назначен" });
        }

        return Ok();
    }

    // DELETE: /api/skills/volunteer/1/5 — убрать навык у волонтёра
    [HttpDelete("volunteer/{volunteerId:int}/{skillId:int}")]
    [Authorize(Roles = "Администратор,Менеджер")]
    public async Task<IActionResult> RemoveSkill(int volunteerId, int skillId, CancellationToken ct)
    {
        var vs = await _db.Volunteer_Skills
            .FirstOrDefaultAsync(x => x.volunteer_id == volunteerId && x.skill_id == skillId, ct);

        if (vs is null) return NotFound(new { message = "Навык не назначен этому волонтёру" });

        _db.Volunteer_Skills.Remove(vs);
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }
}
