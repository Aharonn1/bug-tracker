using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using MyBackendApi.Models.Common;

namespace MyBackendApi.Models.Entities;

[Table("SystemErrorIncidents")]
public class SystemErrorIncident : AuditableEntity
{
    [Key]
    public long IncidentId { get; set; }

    [Required]
    [MaxLength(64)]
    public string ErrorFingerprintHash { get; set; } = string.Empty;

    [Required]
    [MaxLength(50)]
    public string ErrorCode { get; set; } = null!;

    [MaxLength(50)]
    public string? CaseNumber { get; set; }

    [MaxLength(100)]
    public string? ExternalReferenceId { get; set; }

    [MaxLength(100)]
    public string? ClientStationId { get; set; }

    [MaxLength(100)]
    public string? UserId { get; set; }

    [Required]
    public string ErrorMessage { get; set; } = null!;

    public IncidentStatus Status { get; set; } = IncidentStatus.New;

    public int OccurrencesCount { get; set; } = 1;

    public DateTime LastSeenAt { get; set; } = DateTime.UtcNow;

    public bool IsResolved { get; set; }

    public DateTime? ResolvedAt { get; set; }

    // Navigation Properties
    [ForeignKey(nameof(ErrorCode))]
    public virtual ErrorCatalog? ErrorCatalog { get; set; }

    public virtual IncidentDetailPayload? Details { get; set; }
}