using System;
using System.Collections.Generic;

namespace VolunteerSystem.Server.Models;

public partial class Volunteer_Skill
{
    public int volunteer_id { get; set; }

    public int skill_id { get; set; }

    public int? year_confirmed { get; set; }

    public virtual Skill skill { get; set; } = null!;

    public virtual Volunteer volunteer { get; set; } = null!;
}
