using System.ComponentModel.DataAnnotations;

namespace CloudSec.Api.Models;

public class SecurityExceptionEvent
{
    public int Id { get; set; }

    public int RequestId { get; set; }

    [Required]
    [MaxLength(32)]
    public string EventType { get; set; } = string.Empty;

    [Required]
    [MaxLength(32)]
    public string FromStatus { get; set; } = string.Empty;

    [Required]
    [MaxLength(32)]
    public string ToStatus { get; set; } = string.Empty;

    [Required]
    [MaxLength(255)]
    public string ActorEmail { get; set; } = string.Empty;

    [MaxLength(1000)]
    public string Comment { get; set; } = string.Empty;

    public DateTime CreatedUtc { get; set; } = DateTime.UtcNow;
}
