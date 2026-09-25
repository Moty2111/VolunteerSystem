using System;
using System.Collections.Generic;

namespace VolunteerSystem.Server.Models;

public partial class Role
{
    public int role_id { get; set; }

    public string role_name { get; set; } = null!;

    public virtual ICollection<Assignment> Assignments { get; set; } = new List<Assignment>();
}
