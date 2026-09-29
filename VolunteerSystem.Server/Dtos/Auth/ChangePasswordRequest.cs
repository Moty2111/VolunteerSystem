using System.ComponentModel.DataAnnotations;

namespace VolunteerSystem.Server.Dtos.Auth;

/// <summary>Смена пароля. Пароль хранится и сравнивается открытым текстом — без хэширования.</summary>
public class ChangePasswordRequest
{
    [Required(ErrorMessage = "Введите текущий пароль")]
    [StringLength(256, MinimumLength = 1, ErrorMessage = "Введите текущий пароль")]
    public string CurrentPassword { get; set; } = string.Empty;

    [Required(ErrorMessage = "Введите новый пароль")]
    [StringLength(256, MinimumLength = 6, ErrorMessage = "Новый пароль должен содержать минимум 6 символов")]
    public string NewPassword { get; set; } = string.Empty;
}
