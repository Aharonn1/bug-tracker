namespace MyBackendApi.Models.DTOs.Telemetry;

public record AppServiceHealthMetricsDto(
    List<MetricPointDto> CpuTimeSeconds,
    List<MetricPointDto> MemoryWorkingSetBytes,
    List<MetricPointDto> Requests,
    List<MetricPointDto> Http5xx,
    List<MetricPointDto> AverageResponseTimeSeconds,
    List<MetricPointDto> HttpQueueLength,
    DateTimeOffset GeneratedAt,
    ResourceHealthStatusDto? ResourceHealth = null,
    // אחוזים ברמת ה-App Service Plan - אותם מדדים בדיוק ש-backend-cpu-high-alert
    // ו-backend-memory-high-alert מתריעים עליהם (80%/85%), כדי שאפשר יהיה לראות
    // בעין את המגמה מתקרבת לסף לפני שהיא חוצה אותו, לא רק לקבל התראה אחרי העובדה
    List<MetricPointDto>? CpuPercent = null,
    List<MetricPointDto>? MemoryPercent = null
);
