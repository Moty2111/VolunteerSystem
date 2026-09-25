using System;
using System.Collections.Generic;

namespace VolunteerSystem.Server.Models;

public partial class vw_VolunteerSummary
{
    public int volunteer_id { get; set; }

    public string full_name { get; set; } = null!;

    public string city { get; set; } = null!;

    public int? events_count { get; set; }

    public decimal total_hours { get; set; }
}
