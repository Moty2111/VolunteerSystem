namespace VolunteerSystem.Server.Dtos.Events;

public class UpdateEventDto
{
    public string EventName { get; set; } = string.Empty;
    public DateTime DateStart { get; set; }
    public DateTime DateEnd { get; set; }
    public string Location { get; set; } = string.Empty;
    public int EventTypeId { get; set; }
    public string? Description { get; set; }
    public string Status { get; set; } = "Запланировано";
}