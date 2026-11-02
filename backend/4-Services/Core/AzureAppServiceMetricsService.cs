using MyBackendApi.Models.DTOs.Telemetry;

namespace MyBackendApi.Services.Core;

// קורא ישירות ממדדי הפלטפורמה של ה-App Service (הבקאנד עצמו) - CPU, זיכרון,
// בקשות, שגיאות 5xx וזמן תגובה. אותו Service Principal כמו AzureSqlMetricsService,
// רק שהרשאת "Monitoring Reader" כבר מוקצית ברמת ה-resource group ולכן מכסה
// גם את המשאב הזה בלי הגדרה נוספת
public class AzureAppServiceMetricsService(IConfiguration configuration, AzureResourceMetricsReader reader, AzureResourceHealthReader healthReader, ILogger<AzureAppServiceMetricsService> logger)
{
    private readonly string? _resourceId = configuration["Monitoring:AppServiceResourceId"];
    // משאב נפרד מה-App Service עצמו - CpuPercentage/MemoryPercentage נמדדים
    // ברמת ה-Plan (Microsoft.Web/serverfarms), לא ברמת ה-site, בדיוק כמו
    // backend-cpu-high-alert/backend-memory-high-alert שמוגדרים על אותו משאב
    private readonly string? _planResourceId = configuration["Monitoring:AppServicePlanResourceId"];

    // HttpQueueLength הוא המדד הכי ישיר למצב שגילינו בבדיקת העומס - כמה
    // בקשות ממתינות בתור כי אין worker thread פנוי לטפל בהן, בלי קשר ל-DB בכלל
    private static readonly string[] MetricNames = ["CpuTime", "MemoryWorkingSet", "Requests", "Http5xx", "AverageResponseTime", "HttpQueueLength"];
    private static readonly string[] PlanMetricNames = ["CpuPercentage", "MemoryPercentage"];

    public async Task<AppServiceHealthMetricsDto?> GetAppServiceHealthAsync(TimeSpan window, CancellationToken ct = default)
    {
        var metrics = await reader.QueryAsync(_resourceId, MetricNames, window, ct);
        if (metrics is null) return null;

        // תוספת, לא הליבה של הכרטיס - כשל כאן לא אמור להפיל את הצגת המדדים
        // העיקריים (שכבר נשלפו בהצלחה למעלה), רק להישאר null ולהתלונן בלוג
        ResourceHealthStatusDto? resourceHealth = null;
        try
        {
            resourceHealth = await healthReader.GetAvailabilityAsync(_resourceId, ct);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "לא ניתן היה לקבל Resource Health עבור ה-App Service - ממשיכים בלי זה");
        }

        List<MetricPointDto>? cpuPercent = null;
        List<MetricPointDto>? memoryPercent = null;
        try
        {
            var planMetrics = await reader.QueryAsync(_planResourceId, PlanMetricNames, window, ct);
            if (planMetrics is not null)
            {
                cpuPercent = planMetrics["CpuPercentage"];
                memoryPercent = planMetrics["MemoryPercentage"];
            }
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "לא ניתן היה לקבל CPU%/Memory% ברמת ה-App Service Plan - ממשיכים בלי זה");
        }

        return new AppServiceHealthMetricsDto(
            CpuTimeSeconds: metrics["CpuTime"],
            MemoryWorkingSetBytes: metrics["MemoryWorkingSet"],
            Requests: metrics["Requests"],
            Http5xx: metrics["Http5xx"],
            AverageResponseTimeSeconds: metrics["AverageResponseTime"],
            HttpQueueLength: metrics["HttpQueueLength"],
            GeneratedAt: DateTimeOffset.UtcNow,
            ResourceHealth: resourceHealth,
            CpuPercent: cpuPercent,
            MemoryPercent: memoryPercent
        );
    }
}
