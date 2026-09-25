using System;
using System.Collections.Generic;

namespace VolunteerSystem.Server.Models;

public partial class Event
{
    public int event_id { get; set; }

    public string event_name { get; set; } = null!;

    public DateTime date_start { get; set; }

    public DateTime date_end { get; set; }

    public string location { get; set; } = null!;

    public int event_type_id { get; set; }

    public string? description { get; set; }

    public string status { get; set; } = null!;

    public int coordinator_id { get; set; }

    public DateTime created_at { get; set; }

    public virtual ICollection<Assignment> Assignments { get; set; } = new List<Assignment>();

    public virtual ICollection<Event_Partner> Event_Partners { get; set; } = new List<Event_Partner>();

    public virtual SystemUser coordinator { get; set; } = null!;

    public virtual EventType event_type { get; set; } = null!;
}
