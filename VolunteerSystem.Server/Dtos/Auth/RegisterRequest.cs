using System.ComponentModel.DataAnnotations;

namespace VolunteerSystem.Server.Dtos.Auth;

public class RegisterRequest
{
    [Required(ErrorMessage = "Укажите ФИО")]
    [StringLength(200, MinimumLength = 2, ErrorMessage = "ФИО: от 2 до 200 символов")]
    public string FullName { get; set; } = string.Empty;

    [Required(ErrorMessage = "Укажите дату рождения")]
    [DataType(DataType.Date)]
    public DateTime BirthDate { get; set; }

    [Required(ErrorMessage = "Укажите телефон")]
    [StringLength(20, MinimumLength = 6, ErrorMessage = "Телефон: от 6 до 20 символов")]
    [RegularExpression(@"^[\d\s()+-]{6,20}$", ErrorMessage = "Телефон может содержать только цифры, пробелы и + - ( )")]
    public string Phone { get; set; } = string.Empty;

    [Required(ErrorMessage = "Укажите email")]
    [EmailAddress(ErrorMessage = "Некорректный email")]
    [StringLength(150, ErrorMessage = "Email: максимум 150 символов")]
    public string Email { get; set; } = string.Empty;

    [Required(ErrorMessage = "Укажите город")]
    [StringLength(100, MinimumLength = 2, ErrorMessage = "Город: от 2 до 100 символов")]
    public string City { get; set; } = string.Empty;

    [Required(ErrorMessage = "Укажите логин")]
    [StringLength(100, MinimumLength = 3, ErrorMessage = "Логин: от 3 до 100 символов")]
    [RegularExpression(@"^[A-Za-zА-Яа-яЁё0-9._-]+$", ErrorMessage = "Логин: только латиница, кириллица, цифры и . _ -")]
    public string LoginName { get; set; } = string.Empty;

    [Required(ErrorMessage = "Придумайте пароль")]
    [StringLength(256, MinimumLength = 6, ErrorMessage = "Пароль: минимум 6 символов")]
    public string Password { get; set; } = string.Empty;
}
