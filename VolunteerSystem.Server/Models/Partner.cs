using System;
using System.Collections.Generic;

namespace VolunteerSystem.Server.Models;

public partial class Partner
{
    public int partner_id { get; set; }

    public string partner_name { get; set; } = null!;

    public string? inn { get; set; }

    public string? contact_person { get; set; }

    public string? phone { get; set; }

    public string? email { get; set; }

    public decimal? support_amount { get; set; }

    public string? contract_number { get; set; }

    public DateOnly? contract_date { get; set; }

    public virtual ICollection<Event_Partner> Event_Partners { get; set; } = new List<Event_Partner>();
}
