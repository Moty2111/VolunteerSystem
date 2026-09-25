namespace VolunteerSystem.Server.Dtos.Reports;

public class PartnerReportRow
{
    public string partner_name { get; set; } = string.Empty;
    public string? inn { get; set; }
    public string? contract_number { get; set; }
    public decimal? total_support { get; set; }
    public int events_supported { get; set; }
    public decimal allocated_amount { get; set; }
}