using Azure.Identity;
using Azure.Monitor.Query;
using MyBackendApi.Exceptions;
using MyBackendApi.Models.DTOs.Telemetry;

namespace MyBackendApi.Services.Core;

// קורא ישירות ממדדי הפלטפורמה של Azure SQL Database (DTU/Workers/Sessions) -
// משתמש ב-AzureResourceMetricsReader המשותף, עם תפקיד "Monitoring Reader"
// שצריך להיות מוקצה על משאב ה-SQL (או ה-resource group) כדי שזה יעבוד
public class AzureSqlMetricsService(IConfiguration configuration, AzureResourceMetricsReader reader, AzureResourceHealthReader healthReader, ILogger<AzureSqlMetricsService> logger)
{
    private readonly string? _resourceId = configuration["Monitoring:SqlResourceId"];
    private readonly string? _workspaceId = configuration["Monitoring:WorkspaceId"];
    private readonly LogsQueryClient? _logsClient = BuildLogsClient(configuration);

    private static readonly string[] MetricNames = ["dtu_consumption_percent", "workers_percent", "sessions_percent"];

    // אירועים נקודתיים (לא אחוזי ניצול) - Deadlocks/Blocks/Errors/Timeouts.
    // דורשים Diagnostic Setting פעיל על משאב ה-SQL שמזרים לקטגוריות האלה
    // ל-Log Analytics workspace (ראו sqlDatabaseDiagnostics ב-bicep) - לא
    // נראה בכלל במדדי Azure Monitor הרגילים
    private const string DiagnosticsQuery = @"
        AzureDiagnostics
        | where ResourceProvider == ""MICROSOFT.SQL"" and Category in (""Errors"", ""Blocks"", ""Deadlocks"", ""Timeouts"")
        | summarize Count = count() by Category";

    private static LogsQueryClient? BuildLogsClient(IConfiguration configuration)
    {
        var tenantId = configuration["Monitoring:TenantId"];
        var clientId = configuration["Monitoring:ClientId"];
        var clientSecret = configuration["Monitoring:ClientSecret"];

        if (string.IsNullOrEmpty(tenantId) || string.IsNullOrEmpty(clientId) || string.IsNullOrEmpty(clientSecret))
        {
            return null;
        }

        return new LogsQueryClient(new ClientSecretCredential(tenantId, clientId, clientSecret));
    }

    public async Task<SqlHealthMetricsDto?> GetSqlHealthAsync(TimeSpan window, CancellationToken ct = default)
    {
        var metrics = await reader.QueryAsync(_resourceId, MetricNames, window, ct);
        if (metrics is null) return null;

        // שתי התוספות הבאות הן לא הליבה של הכרטיס - כשל באחת מהן לא אמור
        // להפיל את הצגת המדדים העיקריים (שכבר נשלפו בהצלחה למעלה), רק
        // להישאר null ולהתלונן בלוג
        ResourceHealthStatusDto? resourceHealth = null;
        try
        {
            resourceHealth = await healthReader.GetAvailabilityAsync(_resourceId, ct);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "לא ניתן היה לקבל Resource Health עבור משאב ה-SQL - ממשיכים בלי זה");
        }

        SqlDiagnosticSummaryDto? diagnosticSummary = null;
        try
        {
            diagnosticSummary = await GetDiagnosticSummaryAsync(window, ct);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "לא ניתן היה לקבל אבחוני SQL (Deadlocks/Blocks/Errors/Timeouts) מ-Log Analytics - ממשיכים בלי זה");
        }

        return new SqlHealthMetricsDto(
            DtuPercent: metrics["dtu_consumption_percent"],
            WorkersPercent: metrics["workers_percent"],
            SessionsPercent: metrics["sessions_percent"],
            GeneratedAt: DateTimeOffset.UtcNow,
            ResourceHealth: resourceHealth,
            DiagnosticSummary: diagnosticSummary
        );
    }

    private async Task<SqlDiagnosticSummaryDto?> GetDiagnosticSummaryAsync(TimeSpan window, CancellationToken ct)
    {
        if (_logsClient is null || string.IsNullOrEmpty(_workspaceId))
        {
            logger.LogWarning("אבחוני SQL לא מוגדרים - חסרים פרטי התחברות (Monitoring:TenantId/ClientId/ClientSecret) או Monitoring:WorkspaceId");
            return null;
        }

        try
        {
            var response = await _logsClient.QueryWorkspaceAsync(_workspaceId, DiagnosticsQuery, new QueryTimeRange(window), cancellationToken: ct);

            var counts = new Dictionary<string, long>();
            foreach (var row in response.Value.Table.Rows)
            {
                var category = row.GetString("Category");
                var count = row.GetInt64("Count") ?? 0;
                if (category is not null) counts[category] = count;
            }

            return new SqlDiagnosticSummaryDto(
                ErrorsCount: counts.GetValueOrDefault("Errors"),
                BlocksCount: counts.GetValueOrDefault("Blocks"),
                DeadlocksCount: counts.GetValueOrDefault("Deadlocks"),
                TimeoutsCount: counts.GetValueOrDefault("Timeouts"),
                GeneratedAt: DateTimeOffset.UtcNow
            );
        }
        catch (Exception ex)
        {
            // כשל אמיתי בשאילתה (הרשאות, Diagnostic Setting עדיין לא הופעל,
            // הטבלה עדיין לא קיימת כי שום לוג לא זרם אליה) - נזרק החוצה
            // ונתפס ברמת הקריאה (best-effort), לא מוסתר כאן בשקט
            throw new AzureSqlDiagnosticsQueryFailedException(ex);
        }
    }
}
