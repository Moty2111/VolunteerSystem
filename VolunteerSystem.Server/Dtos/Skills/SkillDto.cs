namespace VolunteerSystem.Server.Dtos.Skills;

public class SkillDto
{
    public int SkillId { get; set; }
    public string SkillName { get; set; } = string.Empty;
    public string Level { get; set; } = string.Empty;
    public int AssignedCount { get; set; }
}