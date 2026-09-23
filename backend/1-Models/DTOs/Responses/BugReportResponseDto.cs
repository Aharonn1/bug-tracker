using MyBackendApi.Models.Common;

namespace MyBackendApi.Models.DTOs.Responses;

public record BugReportResponseDto(
    int Id,
    string TenantId,
    string Title,
    string Description,
    string SystemModule,
    IncidentSeverity Priority,
    IncidentStatus Status,
    DateTime CreatedAt,
    DateTime? ResolvedAt
);