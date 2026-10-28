using MyBackendApi.Models.DTOs.Telemetry;

namespace MyBackendApi.Services.Core;

// קורא ישירות ממדדי הפלטפורמה של Azure SQL Database (DTU/Workers/Sessions) -
// משתמש ב-AzureResourceMetricsReader המשותף, עם תפקיד "Monitoring Reader"
// שצריך להיות מוקצה על משאב ה-SQL (או ה-resource group) כדי שזה יעבוד
public class AzureSqlMetricsService(IConfiguration configuration, AzureResourceMetricsReader reader, AzureResourceHealthReader healthReader, ILogger<AzureSqlMetricsService> logger)
{
    private readonly string? _resourceId = configuration["Monitoring:SqlResourceId"];

    private static readonly string[] MetricNames = ["dtu_consumption_percent", "workers_percent", "sessions_percent"];

    public async Task<SqlHealthMetricsDto?> GetSqlHealthAsync(TimeSpan window, CancellationToken ct = default)
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
            logger.LogWarning(ex, "לא ניתן היה לקבל Resource Health עבור משאב ה-SQL - ממשיכים בלי זה");
        }

        return new SqlHealthMetricsDto(
            DtuPercent: metrics["dtu_consumption_percent"],
            WorkersPercent: metrics["workers_percent"],
            SessionsPercent: metrics["sessions_percent"],
            GeneratedAt: DateTimeOffset.UtcNow,
            ResourceHealth: resourceHealth
        );
    }
}
