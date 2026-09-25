namespace VolunteerSystem.Server.Dtos.Auth;

public class AuthResponse
{
    public string Token { get; set; } = string.Empty;
    public string LoginName { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public int? VolunteerId { get; set; }
    public DateTime ExpiresAt { get; set; }
}