namespace MyBackendApi.Models.DTOs.Responses;

public record FailedIncidentSummaryDto(
    long Id,
    string TenantId,
    string ErrorCode,
    string ErrorMessage,
    DateTime FirstFailedAt,
    DateTime LastAttemptAt,
    int AttemptCount
);

public record FailedIncidentRetryResultDto(bool Succeeded, string? ErrorMessage);

public record FailedIncidentsCountDto(int Count);
