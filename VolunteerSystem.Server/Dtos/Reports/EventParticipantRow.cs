namespace VolunteerSystem.Server.Dtos.Reports;

public class EventParticipantRow
{
    public int event_id { get; set; }
    public string event_name { get; set; } = string.Empty;
    public DateTime date_start { get; set; }
    public string volunteer_name { get; set; } = string.Empty;
    public string role_name { get; set; } = string.Empty;
    public decimal? hours_actual { get; set; }
    public bool confirmed { get; set; }
}