using System.ComponentModel.DataAnnotations;

namespace VolunteerSystem.Server.Dtos.Events;

/// <summary>Допустимые статусы мероприятия — единый список для клиента и сервера.</summary>
public static class EventStatuses
{
    public const string Planned = "Запланировано";
    public const string InProgress = "Идёт";
    public const string Finished = "Завершено";
    public const string Cancelled = "Отменено";

    public static readonly string[] All = [Planned, InProgress, Finished, Cancelled];

    /// <summary>Регулярное выражение для атрибута (должно быть константой).</summary>
    public const string AllowedPattern = @"^(Запланировано|Идёт|Завершено|Отменено)$";
}

public class CreateEventDto : IValidatableObject
{
    [Required(ErrorMessage = "Укажите название мероприятия")]
    [StringLength(250, MinimumLength = 2, ErrorMessage = "Название: от 2 до 250 символов")]
    public string EventName { get; set; } = string.Empty;

    [Required(ErrorMessage = "Укажите дату начала")]
    [DataType(DataType.DateTime)]
    public DateTime DateStart { get; set; }

    [Required(ErrorMessage = "Укажите дату окончания")]
    [DataType(DataType.DateTime)]
    public DateTime DateEnd { get; set; }

    [Required(ErrorMessage = "Укажите место проведения")]
    [StringLength(300, MinimumLength = 2, ErrorMessage = "Место: от 2 до 300 символов")]
    public string Location { get; set; } = string.Empty;

    [Range(1, int.MaxValue, ErrorMessage = "Выберите тип мероприятия")]
    public int EventTypeId { get; set; }

    [StringLength(2000, ErrorMessage = "Описание: максимум 2000 символов")]
    public string? Description { get; set; }

    [Required(ErrorMessage = "Укажите статус")]
    [RegularExpression(EventStatuses.AllowedPattern, ErrorMessage = "Недопустимый статус")]
    public string Status { get; set; } = EventStatuses.Planned;

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (DateEnd < DateStart)
            yield return new ValidationResult(
                "Дата окончания не может быть раньше даты начала",
                [nameof(DateEnd)]);
    }
}
