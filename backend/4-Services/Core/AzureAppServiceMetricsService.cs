using MyBackendApi.Models.DTOs.Telemetry;

namespace MyBackendApi.Services.Core;

// קורא ישירות ממדדי הפלטפורמה של ה-App Service (הבקאנד עצמו) - CPU, זיכרון,
// בקשות, שגיאות 5xx וזמן תגובה. אותו Service Principal כמו AzureSqlMetricsService,
// רק שהרשאת "Monitoring Reader" כבר מוקצית ברמת ה-resource group ולכן מכסה
// גם את המשאב הזה בלי הגדרה נוספת
public class AzureAppServiceMetricsService(IConfiguration configuration, AzureResourceMetricsReader reader)
{
    private readonly string? _resourceId = configuration["Monitoring:AppServiceResourceId"];

    private static readonly string[] MetricNames = ["CpuTime", "MemoryWorkingSet", "Requests", "Http5xx", "AverageResponseTime"];

    public async Task<AppServiceHealthMetricsDto?> GetAppServiceHealthAsync(TimeSpan window, CancellationToken ct = default)
    {
        var metrics = await reader.QueryAsync(_resourceId, MetricNames, window, ct);
        if (metrics is null) return null;

        return new AppServiceHealthMetricsDto(
            CpuTimeSeconds: metrics["CpuTime"],
            MemoryWorkingSetBytes: metrics["MemoryWorkingSet"],
            Requests: metrics["Requests"],
            Http5xx: metrics["Http5xx"],
            AverageResponseTimeSeconds: metrics["AverageResponseTime"],
            GeneratedAt: DateTimeOffset.UtcNow
        );
    }
}
