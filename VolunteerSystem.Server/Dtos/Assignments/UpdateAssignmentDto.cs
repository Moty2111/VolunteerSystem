using System.ComponentModel.DataAnnotations;

namespace VolunteerSystem.Server.Dtos.Assignments;

public class UpdateAssignmentDto
{
    [Range(0, 1000, ErrorMessage = "Часы: от 0 до 1000")]
    public decimal? HoursActual { get; set; }

    public bool Confirmed { get; set; }
}
