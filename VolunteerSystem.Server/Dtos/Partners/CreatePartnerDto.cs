using System.ComponentModel.DataAnnotations;

namespace VolunteerSystem.Server.Dtos.Partners;

public class CreatePartnerDto
{
    [Required(ErrorMessage = "Укажите название организации")]
    [StringLength(250, MinimumLength = 2, ErrorMessage = "Название: от 2 до 250 символов")]
    public string PartnerName { get; set; } = string.Empty;

    [RegularExpression(@"^\d{12}$", ErrorMessage = "ИНН должен содержать 12 цифр")]
    [StringLength(12, ErrorMessage = "ИНН: 12 цифр")]
    public string? Inn { get; set; }

    [StringLength(200, ErrorMessage = "Контактное лицо: максимум 200 символов")]
    public string? ContactPerson { get; set; }

    [RegularExpression(@"^[\d\s()+-]{6,20}$", ErrorMessage = "Некорректный телефон")]
    [StringLength(20, ErrorMessage = "Телефон: максимум 20 символов")]
    public string? Phone { get; set; }

    [EmailAddress(ErrorMessage = "Некорректный email")]
    [StringLength(150, ErrorMessage = "Email: максимум 150 символов")]
    public string? Email { get; set; }

    [Range(0, double.MaxValue, ErrorMessage = "Сумма поддержки не может быть отрицательной")]
    public decimal? SupportAmount { get; set; }

    [StringLength(100, ErrorMessage = "Номер договора: максимум 100 символов")]
    public string? ContractNumber { get; set; }

    public DateOnly? ContractDate { get; set; }
}
