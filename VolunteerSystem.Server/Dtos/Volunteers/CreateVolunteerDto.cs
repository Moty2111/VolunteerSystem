using System.ComponentModel.DataAnnotations;

namespace VolunteerSystem.Server.Dtos.Volunteers;

public class CreateVolunteerDto
{
    [Required(ErrorMessage = "Укажите ФИО")]
    [StringLength(200, MinimumLength = 2, ErrorMessage = "ФИО: от 2 до 200 символов")]
    public string FullName { get; set; } = string.Empty;

    [Required(ErrorMessage = "Укажите дату рождения")]
    [DataType(DataType.Date)]
    public DateOnly BirthDate { get; set; }

    [Required(ErrorMessage = "Укажите телефон")]
    [StringLength(20, MinimumLength = 6, ErrorMessage = "Телефон: от 6 до 20 символов")]
    public string Phone { get; set; } = string.Empty;

    [Required(ErrorMessage = "Укажите email")]
    [EmailAddress(ErrorMessage = "Некорректный email")]
    [StringLength(150, ErrorMessage = "Email: максимум 150 символов")]
    public string Email { get; set; } = string.Empty;

    [Required(ErrorMessage = "Укажите город")]
    [StringLength(100, MinimumLength = 2, ErrorMessage = "Город: от 2 до 100 символов")]
    public string City { get; set; } = string.Empty;

    public DateOnly? MedBookValidUntil { get; set; }

    /// <summary>Согласие на обработку персональных данных (обязательно по 152-ФЗ).</summary>
    public bool PersonalDataConsent { get; set; }
}
