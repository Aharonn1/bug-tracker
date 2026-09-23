using System.ComponentModel.DataAnnotations;
using MyBackendApi.Models.Common;

namespace MyBackendApi.Models.DTOs.Ingestion;

public record CreateBugReportDto(
    [Required] string TenantId,
    [Required] string Title,
    [Required] string Description,
    string SystemModule,
    IncidentSeverity Priority
);

public record UpdateBugStatusDto(
    IncidentStatus Status
);