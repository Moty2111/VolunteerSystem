using System.ComponentModel.DataAnnotations;

namespace VolunteerSystem.Server.Dtos.Events;

public class CreateEventCommentDto
{
    [Required(ErrorMessage = "Напишите сообщение")]
    [StringLength(2000, MinimumLength = 1, ErrorMessage = "Сообщение: от 1 до 2000 символов")]
    public string Text { get; set; } = string.Empty;
}

public class EventCommentDto
{
    public int CommentId { get; set; }

    public int EventId { get; set; }

    public int UserId { get; set; }

    public string AuthorName { get; set; } = string.Empty;

    public string Text { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; }
}
