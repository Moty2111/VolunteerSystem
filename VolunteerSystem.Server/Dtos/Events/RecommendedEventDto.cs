namespace VolunteerSystem.Server.Dtos.Events;

/// <summary>Мероприятие из персональных рекомендаций волонтёра.</summary>
public class RecommendedEventDto
{
    public int EventId { get; set; }

    public string EventName { get; set; } = string.Empty;

    public DateTime DateStart { get; set; }

    public DateTime DateEnd { get; set; }

    public string Location { get; set; } = string.Empty;

    public int EventTypeId { get; set; }

    public string? EventTypeName { get; set; }

    public string Status { get; set; } = string.Empty;

    public int AssignmentsCount { get; set; }

    /// <summary>Насколько мероприятие подходит волонтёру (больше — лучше).</summary>
    public int Score { get; set; }

    /// <summary>Человекочитаемые причины рекомендации.</summary>
    public List<string> Reasons { get; set; } = new();
}
