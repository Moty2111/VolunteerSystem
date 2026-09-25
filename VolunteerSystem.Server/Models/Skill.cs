using System;
using System.Collections.Generic;

namespace VolunteerSystem.Server.Models;

public partial class Skill
{
    public int skill_id { get; set; }

    public string skill_name { get; set; } = null!;

    public string level { get; set; } = null!;

    public virtual ICollection<Volunteer_Skill> Volunteer_Skills { get; set; } = new List<Volunteer_Skill>();
}
