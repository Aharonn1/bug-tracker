using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MyBackendApi.Models.Entities;

[Table("IncidentDetailPayloads")]
public class IncidentDetailPayload
{
    [Key]
    public long IncidentId { get; set; }

    public string? StackTrace { get; set; }

    public string? RawPayload { get; set; }

    [ForeignKey(nameof(IncidentId))]
    public virtual SystemErrorIncident Incident { get; set; } = null!;
}