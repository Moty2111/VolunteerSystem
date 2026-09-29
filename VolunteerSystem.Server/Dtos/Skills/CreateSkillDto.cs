using System.ComponentModel.DataAnnotations;

namespace VolunteerSystem.Server.Dtos.Skills;

public class CreateSkillDto
{
    [Required(ErrorMessage = "Укажите название навыка")]
    [StringLength(150, MinimumLength = 2, ErrorMessage = "Название навыка: от 2 до 150 символов")]
    public string SkillName { get; set; } = string.Empty;

    [Required(ErrorMessage = "Укажите уровень")]
    [StringLength(50, MinimumLength = 2, ErrorMessage = "Уровень: от 2 до 50 символов")]
    public string Level { get; set; } = "Начальный";
}
