namespace VolunteerSystem.Server.Dtos.Reports;

public class VolunteerRatingRow
{
    public int volunteer_id { get; set; }
    public string full_name { get; set; } = string.Empty;
    public string city { get; set; } = string.Empty;
    public decimal total_hours { get; set; }
    public int events_count { get; set; }
    public long rating { get; set; }
}