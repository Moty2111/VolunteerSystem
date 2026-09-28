namespace VolunteerSystem.Server.Dtos.Auth;

/// <summary>Смена пароля. Пароль хранится и сравнивается открытым текстом — без хэширования.</summary>
public class ChangePasswordRequest
{
    public string CurrentPassword { get; set; } = string.Empty;
    public string NewPassword { get; set; } = string.Empty;
}
