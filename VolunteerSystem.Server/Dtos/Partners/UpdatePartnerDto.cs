namespace VolunteerSystem.Server.Dtos.Partners;

public class UpdatePartnerDto
{
    public string PartnerName { get; set; } = string.Empty;
    public string? Inn { get; set; }
    public string? ContactPerson { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public decimal? SupportAmount { get; set; }
    public string? ContractNumber { get; set; }
    public DateOnly? ContractDate { get; set; }
}   