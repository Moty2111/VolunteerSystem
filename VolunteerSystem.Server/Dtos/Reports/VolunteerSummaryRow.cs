namespace VolunteerSystem.Server.Dtos.Reports;

public class VolunteerSummaryRow
{
    public int volunteer_id { get; set; }
    public string full_name { get; set; } = string.Empty;
    public string city { get; set; } = string.Empty;
    public int events_count { get; set; }
    public decimal total_hours { get; set; }
}