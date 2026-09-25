using System;
using System.Collections.Generic;

namespace VolunteerSystem.Server.Models;

public partial class EventType
{
    public int event_type_id { get; set; }

    public string type_name { get; set; } = null!;

    public virtual ICollection<Event> Events { get; set; } = new List<Event>();
}
