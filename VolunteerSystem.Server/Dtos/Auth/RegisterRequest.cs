namespace VolunteerSystem.Server.Dtos.Auth;

public class RegisterRequest
{
    public string FullName { get; set; } = string.Empty;
    public DateTime BirthDate { get; set; }
    public string Phone { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string LoginName { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}