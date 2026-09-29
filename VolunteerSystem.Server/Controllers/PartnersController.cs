using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VolunteerSystem.Server.Data;
using VolunteerSystem.Server.Dtos.Partners;
using VolunteerSystem.Server.Models;

namespace VolunteerSystem.Server.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class PartnersController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ILogger<PartnersController> _logger;

    public PartnersController(AppDbContext db, ILogger<PartnersController> logger)
    {
        _db = db;
        _logger = logger;
    }

    // GET: /api/partners?search=Добро
    [HttpGet]
    [Authorize(Roles = "Администратор,Менеджер")]
    public async Task<ActionResult<IEnumerable<PartnerDto>>> GetAll(
        [FromQuery] string? search, CancellationToken ct)
    {
        var query = _db.Partners.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var pattern = search.Trim();
            query = query.Where(p => p.partner_name.Contains(pattern));
        }

        var list = await query
            .OrderBy(p => p.partner_name)
            .Select(p => ToDto(p))
            .ToListAsync(ct);

        return Ok(list);
    }

    // GET: /api/partners/5
    [HttpGet("{id:int}")]
    [Authorize(Roles = "Администратор,Менеджер")]
    public async Task<ActionResult<PartnerDto>> GetById(int id, CancellationToken ct)
    {
        var p = await _db.Partners.AsNoTracking()
            .FirstOrDefaultAsync(x => x.partner_id == id, ct);

        if (p is null) return NotFound(new { message = "Партнёр не найден" });
        return Ok(ToDto(p));
    }

    // POST: /api/partners
    [HttpPost]
    [Authorize(Roles = "Администратор")]
    public async Task<ActionResult<PartnerDto>> Create([FromBody] CreatePartnerDto dto, CancellationToken ct)
    {
        var name = dto.PartnerName.Trim();
        if (await _db.Partners.AnyAsync(p => p.partner_name == name, ct))
            return Conflict(new { message = "Партнёр с таким названием уже есть" });

        var p = new Partner
        {
            partner_name = name,
            inn = dto.Inn?.Trim(),
            contact_person = dto.ContactPerson?.Trim(),
            phone = dto.Phone?.Trim(),
            email = dto.Email?.Trim(),
            support_amount = dto.SupportAmount ?? 0,
            contract_number = dto.ContractNumber?.Trim(),
            contract_date = dto.ContractDate
        };

        _db.Partners.Add(p);
        await _db.SaveChangesAsync(ct);

        return CreatedAtAction(nameof(GetById), new { id = p.partner_id }, ToDto(p));
    }

    // PUT: /api/partners/5
    [HttpPut("{id:int}")]
    [Authorize(Roles = "Администратор")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdatePartnerDto dto, CancellationToken ct)
    {
        var p = await _db.Partners.FirstOrDefaultAsync(x => x.partner_id == id, ct);
        if (p is null) return NotFound(new { message = "Партнёр не найден" });

        p.partner_name = dto.PartnerName.Trim();
        p.inn = dto.Inn?.Trim();
        p.contact_person = dto.ContactPerson?.Trim();
        p.phone = dto.Phone?.Trim();
        p.email = dto.Email?.Trim();
        p.support_amount = dto.SupportAmount ?? 0;
        p.contract_number = dto.ContractNumber?.Trim();
        p.contract_date = dto.ContractDate;

        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    // DELETE: /api/partners/5
    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Администратор")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var p = await _db.Partners.FirstOrDefaultAsync(x => x.partner_id == id, ct);
        if (p is null) return NotFound(new { message = "Партнёр не найден" });

        _db.Partners.Remove(p);
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation("Удалён партнёр {Name} (id {Id})", p.partner_name, id);
        return NoContent();
    }

    private static PartnerDto ToDto(Partner p) => new()
    {
        PartnerId = p.partner_id,
        PartnerName = p.partner_name,
        Inn = p.inn,
        ContactPerson = p.contact_person,
        Phone = p.phone,
        Email = p.email,
        SupportAmount = p.support_amount,
        ContractNumber = p.contract_number,
        ContractDate = p.contract_date
    };
}
