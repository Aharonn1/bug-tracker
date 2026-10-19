namespace MyBackendApi.Models.DTOs.Responses;

public record LoginAttemptSummaryDto(
    long Id,
    string Email,
    string IpAddress,
    string? TenantId,
    string Outcome,
    DateTime AttemptedAt
);

public record BlockedIpSummaryDto(
    long Id,
    string IpAddress,
    DateTime BlockedUntil,
    string Reason,
    DateTime CreatedAt
);
