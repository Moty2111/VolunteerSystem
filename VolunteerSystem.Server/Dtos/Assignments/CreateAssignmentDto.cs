using System.ComponentModel.DataAnnotations;

namespace VolunteerSystem.Server.Dtos.Assignments;

public class CreateAssignmentDto
{
    [Range(1, int.MaxValue, ErrorMessage = "Выберите волонтёра")]
    public int VolunteerId { get; set; }

    [Range(1, int.MaxValue, ErrorMessage = "Выберите мероприятие")]
    public int EventId { get; set; }

    [Range(1, int.MaxValue, ErrorMessage = "Выберите роль")]
    public int RoleId { get; set; }
}
