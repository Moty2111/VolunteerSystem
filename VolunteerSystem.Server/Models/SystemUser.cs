using System;
using System.Collections.Generic;

namespace VolunteerSystem.Server.Models;

public partial class SystemUser
{
    public int user_id { get; set; }

    public int? volunteer_id { get; set; }

    public string login_name { get; set; } = null!;

    public string password_hash { get; set; } = null!;

    public string system_role { get; set; } = null!;

    public bool is_active { get; set; }

    public DateTime created_at { get; set; }

    public virtual ICollection<AuditLog> AuditLogs { get; set; } = new List<AuditLog>();

    public virtual ICollection<Event> Events { get; set; } = new List<Event>();

    public virtual Volunteer? volunteer { get; set; }
}
