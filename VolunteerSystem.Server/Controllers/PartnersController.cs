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

    public PartnersController(AppDbContext db) => _db = db;

    // GET: /api/partners?search=Добро
    [HttpGet]
    [Authorize(Roles = "Администратор,Менеджер")]
    public async Task<ActionResult<IEnumerable<PartnerDto>>> GetAll([FromQuery] string? search)
    {
        var query = _db.Partners.AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(p => p.partner_name.Contains(search));

        var list = await query
            .OrderBy(p => p.partner_name)
            .Select(p => ToDto(p))
            .ToListAsync();

        return Ok(list);
    }

    // GET: /api/partners/5
    [HttpGet("{id:int}")]
    [Authorize(Roles = "Администратор,Менеджер")]
    public async Task<ActionResult<PartnerDto>> GetById(int id)
    {
        var p = await _db.Partners.FindAsync(id);
        if (p is null) return NotFound();
        return Ok(ToDto(p));
    }

    // POST: /api/partners
    [HttpPost]
    [Authorize(Roles = "Администратор")]
    public async Task<ActionResult<PartnerDto>> Create([FromBody] CreatePartnerDto dto)
    {
        var p = new Partner
        {
            partner_name = dto.PartnerName,
            inn = dto.Inn,
            contact_person = dto.ContactPerson,
            phone = dto.Phone,
            email = dto.Email,
            support_amount = dto.SupportAmount ?? 0,
            contract_number = dto.ContractNumber,
            contract_date = dto.ContractDate
        };

        _db.Partners.Add(p);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = p.partner_id }, ToDto(p));
    }

    // PUT: /api/partners/5
    [HttpPut("{id:int}")]
    [Authorize(Roles = "Администратор")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdatePartnerDto dto)
    {
        var p = await _db.Partners.FindAsync(id);
        if (p is null) return NotFound();

        p.partner_name = dto.PartnerName;
        p.inn = dto.Inn;
        p.contact_person = dto.ContactPerson;
        p.phone = dto.Phone;
        p.email = dto.Email;
        p.support_amount = dto.SupportAmount ?? 0;
        p.contract_number = dto.ContractNumber;
        p.contract_date = dto.ContractDate;

        await _db.SaveChangesAsync();
        return NoContent();
    }

    // DELETE: /api/partners/5
    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Администратор")]
    public async Task<IActionResult> Delete(int id)
    {
        var p = await _db.Partners.FindAsync(id);
        if (p is null) return NotFound();

        _db.Partners.Remove(p);
        await _db.SaveChangesAsync();
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