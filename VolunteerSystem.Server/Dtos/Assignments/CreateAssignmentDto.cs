namespace VolunteerSystem.Server.Dtos.Assignments;

public class CreateAssignmentDto
{
    public int VolunteerId { get; set; }
    public int EventId { get; set; }
    public int RoleId { get; set; }
}