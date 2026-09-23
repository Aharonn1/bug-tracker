namespace MyBackendApi.Models.DTOs.Telemetry;

public record OpsSummaryDto(
    long TotalRequests,
    long FailedRequests,
    double MedianResponseTimeMs,
    DateTimeOffset GeneratedAt
);
