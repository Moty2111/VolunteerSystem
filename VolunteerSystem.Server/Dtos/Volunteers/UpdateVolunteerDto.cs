namespace VolunteerSystem.Server.Dtos.Volunteers;

public class UpdateVolunteerDto
{
    public string FullName { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public DateOnly? MedBookValidUntil { get; set; }
    public bool IsActive { get; set; }
}