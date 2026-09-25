using System;
using System.Collections.Generic;

namespace VolunteerSystem.Server.Models;

public partial class Assignment
{
    public int assignment_id { get; set; }

    public int volunteer_id { get; set; }

    public int event_id { get; set; }

    public int role_id { get; set; }

    public decimal? hours_actual { get; set; }

    public bool confirmed { get; set; }

    public DateTime assigned_at { get; set; }

    public virtual Event _event { get; set; } = null!;

    public virtual Role role { get; set; } = null!;

    public virtual Volunteer volunteer { get; set; } = null!;
}
