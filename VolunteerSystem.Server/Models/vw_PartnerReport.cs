using System;
using System.Collections.Generic;

namespace VolunteerSystem.Server.Models;

public partial class vw_PartnerReport
{
    public string partner_name { get; set; } = null!;

    public string? inn { get; set; }

    public string? contract_number { get; set; }

    public decimal? total_support { get; set; }

    public int? events_supported { get; set; }

    public decimal allocated_amount { get; set; }
}
