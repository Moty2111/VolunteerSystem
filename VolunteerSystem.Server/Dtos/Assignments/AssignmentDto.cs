namespace VolunteerSystem.Server.Dtos.Assignments;

public class AssignmentDto
{
    public int AssignmentId { get; set; }
    public int VolunteerId { get; set; }
    public string VolunteerName { get; set; } = string.Empty;
    public int EventId { get; set; }
    public string EventName { get; set; } = string.Empty;
    public DateTime EventDateStart { get; set; }
    public DateTime EventDateEnd { get; set; }
    public int RoleId { get; set; }
    public string? RoleName { get; set; }
    public decimal? HoursActual { get; set; }
    public bool Confirmed { get; set; }
    public DateTime AssignedAt { get; set; }
}