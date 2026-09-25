using System;
using System.Collections.Generic;

namespace VolunteerSystem.Server.Models;

public partial class vw_HoursByPeriod
{
    public string full_name { get; set; } = null!;

    public string city { get; set; } = null!;

    public string event_name { get; set; } = null!;

    public int event_type_id { get; set; }

    public decimal? hours_actual { get; set; }

    public DateTime date_start { get; set; }
}
