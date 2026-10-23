using System;

namespace VolunteerSystem.Server.Models;

public partial class EventComment
{
    public int comment_id { get; set; }

    public int event_id { get; set; }

    public int user_id { get; set; }

    public string text { get; set; } = null!;

    public DateTime created_at { get; set; }

    public virtual Event _event { get; set; } = null!;

    public virtual SystemUser user { get; set; } = null!;
}
