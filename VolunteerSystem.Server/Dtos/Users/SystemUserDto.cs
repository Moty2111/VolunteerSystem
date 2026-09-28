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
    public string Role { get; set; } = string.Empty;
}

public class UpdateUserActiveDto
{
    public bool IsActive { get; set; }
}
