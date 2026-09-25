namespace VolunteerSystem.Server.Dtos.Events;

public class EventDto
{
    public int EventId { get; set; }
    public string EventName { get; set; } = string.Empty;
    public DateTime DateStart { get; set; }
    public DateTime DateEnd { get; set; }
    public string Location { get; set; } = string.Empty;
    public int EventTypeId { get; set; }
    public string? EventTypeName { get; set; }
    public string? Description { get; set; }
    public string Status { get; set; } = string.Empty;
    public int CoordinatorId { get; set; }
    public string? CoordinatorName { get; set; }
    public DateTime CreatedAt { get; set; }
    public int AssignmentsCount { get; set; }
}