namespace VolunteerSystem.Server.Dtos.Volunteers;

public class UpdateMedBookRequest
{
    public DateOnly? ValidUntil { get; set; }

    public string? Status { get; set; }

    public string? Comment { get; set; }
}
