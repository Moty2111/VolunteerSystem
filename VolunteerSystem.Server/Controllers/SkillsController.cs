using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VolunteerSystem.Server.Data;
using VolunteerSystem.Server.Dtos.Skills;
using VolunteerSystem.Server.Models;

namespace VolunteerSystem.Server.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SkillsController : ControllerBase
{
    private static readonly string[] AllowedLevels =
        { "Начальный", "Средний", "Профессиональный", "A1", "A2", "B1", "B2", "C1", "C2" };

    private readonly AppDbContext _db;
    public SkillsController(AppDbContext db) => _db = db;

    // GET: /api/skills
    [HttpGet]
    public async Task<ActionResult<IEnumerable<SkillDto>>> GetAll()
    {
        var list = await _db.Skills
            .Select(s => new SkillDto
            {
                SkillId = s.skill_id,
                SkillName = s.skill_name,
                Level = s.level,
                AssignedCount = s.Volunteer_Skills.Count
            })
            .OrderBy(s => s.SkillName)
            .ToListAsync();

        return Ok(list);
    }

    // POST: /api/skills
    [HttpPost]
    [Authorize(Roles = "Администратор,Менеджер")]
    public async Task<ActionResult<SkillDto>> Create([FromBody] CreateSkillDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.SkillName))
            return BadRequest(new { message = "Название обязательно" });

        if (!AllowedLevels.Contains(dto.Level))
            return BadRequest(new { message = "Недопустимый уровень" });

        var skill = new Skill { skill_name = dto.SkillName, level = dto.Level };
        _db.Skills.Add(skill);
        await _db.SaveChangesAsync();

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
    public async Task<IActionResult> Delete(int id)
    {
        var skill = await _db.Skills.FindAsync(id);
        if (skill is null) return NotFound();

        _db.Skills.Remove(skill);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // GET: /api/skills/volunteer/1 — навыки волонтёра
    [HttpGet("volunteer/{volunteerId:int}")]
    public async Task<ActionResult<IEnumerable<VolunteerSkillDto>>> GetVolunteerSkills(int volunteerId)
    {
        // Волонтёр видит только свои навыки
        if (User.IsInRole("Волонтёр"))
        {
            var ownId = User.FindFirst("VolunteerId")?.Value;
            if (ownId is null || int.Parse(ownId) != volunteerId)
                return Forbid();
        }

        var list = await _db.Volunteer_Skills
            .Where(vs => vs.volunteer_id == volunteerId)
            .Include(vs => vs.skill)
            .Select(vs => new VolunteerSkillDto
            {
                SkillId = vs.skill_id,
                SkillName = vs.skill.skill_name,
                Level = vs.skill.level,
                YearConfirmed = vs.year_confirmed
            })
            .ToListAsync();

        return Ok(list);
    }

    // POST: /api/skills/volunteer/1 — назначить навык волонтёру
    [HttpPost("volunteer/{volunteerId:int}")]
    [Authorize(Roles = "Администратор,Менеджер")]
    public async Task<IActionResult> AssignSkill(int volunteerId, [FromBody] AssignSkillDto dto)
    {
        if (!await _db.Volunteers.AnyAsync(v => v.volunteer_id == volunteerId))
            return NotFound(new { message = "Волонтёр не найден" });

        if (!await _db.Skills.AnyAsync(s => s.skill_id == dto.SkillId))
            return NotFound(new { message = "Навык не найден" });

        if (await _db.Volunteer_Skills.AnyAsync(vs =>
                vs.volunteer_id == volunteerId && vs.skill_id == dto.SkillId))
            return Conflict(new { message = "Этот навык уже назначен" });

        _db.Volunteer_Skills.Add(new Volunteer_Skill
        {
            volunteer_id = volunteerId,
            skill_id = dto.SkillId,
            year_confirmed = dto.YearConfirmed
        });
        await _db.SaveChangesAsync();
        return Ok();
    }

    // DELETE: /api/skills/volunteer/1/5 — убрать навык у волонтёра
    [HttpDelete("volunteer/{volunteerId:int}/{skillId:int}")]
    [Authorize(Roles = "Администратор,Менеджер")]
    public async Task<IActionResult> RemoveSkill(int volunteerId, int skillId)
    {
        var vs = await _db.Volunteer_Skills
            .FirstOrDefaultAsync(x => x.volunteer_id == volunteerId && x.skill_id == skillId);
        if (vs is null) return NotFound();

        _db.Volunteer_Skills.Remove(vs);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}