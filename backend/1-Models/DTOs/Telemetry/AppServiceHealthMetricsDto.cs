namespace MyBackendApi.Models.DTOs.Telemetry;

public record AppServiceHealthMetricsDto(
    List<MetricPointDto> CpuTimeSeconds,
    List<MetricPointDto> MemoryWorkingSetBytes,
    List<MetricPointDto> Requests,
    List<MetricPointDto> Http5xx,
    List<MetricPointDto> AverageResponseTimeSeconds,
    List<MetricPointDto> HttpQueueLength,
    DateTimeOffset GeneratedAt
);
