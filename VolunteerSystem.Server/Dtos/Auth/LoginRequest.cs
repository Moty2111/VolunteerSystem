using System.ComponentModel.DataAnnotations;

namespace VolunteerSystem.Server.Dtos.Auth;

public class LoginRequest
{
    [Required(ErrorMessage = "Введите логин")]
    [StringLength(100, MinimumLength = 2, ErrorMessage = "Логин: от 2 до 100 символов")]
    public string LoginName { get; set; } = string.Empty;

    [Required(ErrorMessage = "Введите пароль")]
    [StringLength(256, MinimumLength = 4, ErrorMessage = "Пароль: минимум 4 символа")]
    public string Password { get; set; } = string.Empty;
}
