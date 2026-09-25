using System;
using System.Collections.Generic;

namespace VolunteerSystem.Server.Models;

public partial class Event_Partner
{
    public int event_id { get; set; }

    public int partner_id { get; set; }

    public decimal? amount { get; set; }

    public virtual Event _event { get; set; } = null!;

    public virtual Partner partner { get; set; } = null!;
}
