namespace VolunteerSystem.Server.Dtos.Volunteers;

public class VolunteerDto
{
    public int VolunteerId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public DateOnly BirthDate { get; set; }
    public string Phone { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public DateOnly? MedBookValidUntil { get; set; }
    public bool PersonalDataConsent { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
}