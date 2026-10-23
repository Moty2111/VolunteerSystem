namespace VolunteerSystem.Server.Dtos.Volunteers;

/// <summary>Достижение (бейдж) волонтёра.</summary>
public class BadgeDto
{
    /// <summary>Код для иконки на клиенте.</summary>
    public string Code { get; set; } = string.Empty;

    public string Title { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    public bool Earned { get; set; }

    /// <summary>Прогресс 0..1 (для ещё не полученных).</summary>
    public double Progress { get; set; }

    public int Current { get; set; }

    public int Target { get; set; }
}

/// <summary>Сводка достижений волонтёра.</summary>
public class AchievementsDto
{
    public List<BadgeDto> Badges { get; set; } = new();

    public int EarnedCount => Badges.Count(b => b.Earned);
}
