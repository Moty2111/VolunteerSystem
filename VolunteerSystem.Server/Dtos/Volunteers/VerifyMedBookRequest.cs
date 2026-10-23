namespace VolunteerSystem.Server.Dtos.Volunteers;

public class VerifyMedBookRequest
{
    public bool Approved { get; set; }

    public DateOnly? ValidUntil { get; set; }

    public string? Comment { get; set; }
}
