namespace VolunteerSystem.Server.Dtos.Skills;

public class CreateSkillDto
{
    public string SkillName { get; set; } = string.Empty;
    public string Level { get; set; } = "Начальный";
}