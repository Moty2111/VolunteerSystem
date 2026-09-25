using System;
using System.Collections.Generic;

namespace VolunteerSystem.Server.Models;

public partial class Volunteer
{
    public int volunteer_id { get; set; }

    public string full_name { get; set; } = null!;

    public DateOnly birth_date { get; set; }

    public string phone { get; set; } = null!;

    public string email { get; set; } = null!;

    public string city { get; set; } = null!;

    public DateOnly? med_book_valid_until { get; set; }

    public bool personal_data_consent { get; set; }

    public bool is_active { get; set; }

    public DateTime created_at { get; set; }

    public virtual ICollection<Assignment> Assignments { get; set; } = new List<Assignment>();

    public virtual SystemUser? SystemUser { get; set; }

    public virtual ICollection<Volunteer_Skill> Volunteer_Skills { get; set; } = new List<Volunteer_Skill>();
}
