using System.ComponentModel.DataAnnotations;
using MyBackendApi.Models.Common;

namespace MyBackendApi.Models.Entities;

public class BugReport : AuditableEntity
{
    [Key]
    public int Id { get; set; }

    [Required]
    [MaxLength(200)]
    public string Title { get; set; } = string.Empty;

    [Required]
    public string Description { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string SystemModule { get; set; } = string.Empty;

    public IncidentSeverity Priority { get; set; } = IncidentSeverity.Medium;

    public IncidentStatus Status { get; set; } = IncidentStatus.New;

    public DateTime? ResolvedAt { get; set; }
}