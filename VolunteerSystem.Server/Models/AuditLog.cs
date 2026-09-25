using System;
using System.Collections.Generic;

namespace VolunteerSystem.Server.Models;

public partial class AuditLog
{
    public int log_id { get; set; }

    public int? user_id { get; set; }

    public string action { get; set; } = null!;

    public string table_name { get; set; } = null!;

    public int? record_id { get; set; }

    public DateTime action_date { get; set; }

    public virtual SystemUser? user { get; set; }
}
