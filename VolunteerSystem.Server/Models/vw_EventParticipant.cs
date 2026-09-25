using System;
using System.Collections.Generic;

namespace VolunteerSystem.Server.Models;

public partial class vw_EventParticipant
{
    public int event_id { get; set; }

    public string event_name { get; set; } = null!;

    public DateTime date_start { get; set; }

    public string volunteer_name { get; set; } = null!;

    public string role_name { get; set; } = null!;

    public decimal? hours_actual { get; set; }

    public bool confirmed { get; set; }
}
