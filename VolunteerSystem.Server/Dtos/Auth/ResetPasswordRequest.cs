using System.ComponentModel.DataAnnotations;

namespace VolunteerSystem.Server.Dtos.Auth;

/// <summary>Установка нового пароля по токену сброса.</summary>
public class ResetPasswordRequest
{
    [Required(ErrorMessage = "Токен сброса отсутствует")]
    public string Token { get; set; } = string.Empty;

    [Required(ErrorMessage = "Введите новый пароль")]
    [StringLength(256, MinimumLength = 8, ErrorMessage = "Новый пароль должен содержать минимум 8 символов")]
    public string NewPassword { get; set; } = string.Empty;
}
