namespace VolunteerSystem.Server.Dtos.Auth;

public class LoginRequest
{
    public string LoginName { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}