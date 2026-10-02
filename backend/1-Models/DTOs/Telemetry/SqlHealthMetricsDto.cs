namespace MyBackendApi.Models.DTOs.Telemetry;

public record MetricPointDto(DateTimeOffset Timestamp, double? Value);

public record SqlHealthMetricsDto(
    List<MetricPointDto> DtuPercent,
    List<MetricPointDto> WorkersPercent,
    List<MetricPointDto> SessionsPercent,
    DateTimeOffset GeneratedAt
);
