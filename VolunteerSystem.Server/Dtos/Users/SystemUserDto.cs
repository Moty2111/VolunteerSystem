using System.ComponentModel.DataAnnotations;

namespace VolunteerSystem.Server.Dtos.Users;

public class SystemUserDto
{
    public int UserId { get; set; }
    public string LoginName { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public int? VolunteerId { get; set; }
    public string? VolunteerName { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class UpdateUserRoleDto
{
    /// <summary>Роли, которые можно назначить. Проверяется на сервере, а не только в UI.</summary>
    public static readonly string[] Roles = ["Администратор", "Менеджер", "Волонтёр"];

    /// <summary>Регулярное выражение для атрибута (должно быть константой).</summary>
    public const string AllowedPattern = @"^(Администратор|Менеджер|Волонтёр)$";

    [Required(ErrorMessage = "Выберите роль")]
    [RegularExpression(AllowedPattern, ErrorMessage = "Недопустимая роль")]
    public string Role { get; set; } = string.Empty;
}

public class UpdateUserActiveDto
{
    public bool IsActive { get; set; }
}
