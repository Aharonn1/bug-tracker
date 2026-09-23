using MyBackendApi.Models.Common;

namespace MyBackendApi.Models.DTOs.Responses;

public record IncidentResponseDto(
    long IncidentId,
    string TenantId,
    string ErrorCode,
    string Category,
    string Subsystem,
    IncidentSeverity Severity,
    IncidentStatus Status,
    string HebrewDescription,
    string? CaseNumber,
    string? ExternalReferenceId,
    string? ClientStationId,
    string? UserId,
    string ErrorMessage,
    string? ResolutionPlaybook,
    string? RecommendedAction,
    string? RootCauseSummary,
    bool IsResolved,
    DateTime CreatedAt,
    DateTime? ResolvedAt
);