using System.ComponentModel.DataAnnotations;

namespace VolunteerSystem.Server.Dtos.Auth;

/// <summary>
/// Запрос ссылки на сброс пароля. Поле принимает логин ИЛИ email
/// (волонтёра) — сервер ищет учётную запись по обоим вариантам.
/// </summary>
public class ForgotPasswordRequest
{
    [Required(ErrorMessage = "Введите логин или email")]
    [StringLength(150, ErrorMessage = "Логин/email: не более 150 символов")]
    public string Email { get; set; } = string.Empty;
}
