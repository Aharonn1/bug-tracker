using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using MyBackendApi.Models.Common;

namespace MyBackendApi.Models.Entities;

[Table("ErrorCatalogs")]
public class ErrorCatalog : AuditableEntity
{
    [Key]
    [MaxLength(50)]
    public string ErrorCode { get; set; } = null!;

    [Required]
    [MaxLength(100)]
    public string Category { get; set; } = null!;

    [Required]
    [MaxLength(100)]
    public string Subsystem { get; set; } = null!;

    public IncidentSeverity SeverityLevel { get; set; } = IncidentSeverity.Medium;

    [Required]
    public string HebrewDescription { get; set; } = null!;

    public string? ResolutionPlaybook { get; set; }
}