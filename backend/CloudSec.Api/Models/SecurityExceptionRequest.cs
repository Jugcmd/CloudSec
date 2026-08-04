using System.ComponentModel.DataAnnotations;

namespace CloudSec.Api.Models;

public class SecurityExceptionRequest
{
    public int Id { get; set; }

    [Required]
    [MaxLength(120)]
    public string Title { get; set; } = string.Empty;

    [Required]
    [MaxLength(4000)]
    public string Description { get; set; } = string.Empty;

    [Required]
    [EmailAddress]
    [MaxLength(255)]
    public string RequesterEmail { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string SystemName { get; set; } = string.Empty;

    [Required]
    [MaxLength(32)]
    public string DataClassification { get; set; } = "Internal";

    [Required]
    [MaxLength(32)]
    public string Status { get; set; } = "Pending";

    [Range(1, 100)]
    public int RiskScore { get; set; }

    public DateTime CreatedUtc { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedUtc { get; set; } = DateTime.UtcNow;
}
