namespace MyBackendApi.Models.DTOs.Telemetry;

public record ClientTelemetryProbeDto(
    string TenantId,
    string? StationId,
    double LatencyMs,
    string? EffectiveConnectionType,
    double? DownlinkSpeedMbps,
    double ExecutionLagMs,
    double? FrameJankMs,
    int? HardwareConcurrency,
    double? DeviceMemoryGb,
    int PingAttempts,
    int PingFailures,
    string UserAgent,
    string CurrentUrl
);

public record TelemetryDiagnosticReport(
    string StatusColor,
    string SummaryTitle,
    string ActionableRecommendation,
    bool IsIssueLocalToClient,
    bool IsFixableByRestart
);