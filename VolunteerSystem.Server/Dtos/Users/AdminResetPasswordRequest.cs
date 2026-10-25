namespace VolunteerSystem.Server.Dtos.Users;

/// <summary>
/// Сброс пароля пользователя админом.
/// Если NewPassword не задан — генерируется временный пароль.
/// </summary>
public class AdminResetPasswordRequest
{
    public string? NewPassword { get; set; }
}
