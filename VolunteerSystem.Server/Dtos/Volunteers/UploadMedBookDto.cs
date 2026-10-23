using Microsoft.AspNetCore.Http;

namespace VolunteerSystem.Server.Dtos.Volunteers;

public class UploadMedBookDto
{
    public IFormFile? File { get; set; }

    public DateOnly? ValidUntil { get; set; }
}
