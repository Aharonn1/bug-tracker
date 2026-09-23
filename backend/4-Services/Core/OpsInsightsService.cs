using Azure.Identity;
using Azure.Monitor.Query;
using MyBackendApi.Models.DTOs.Telemetry;

namespace MyBackendApi.Services.Core;

public class OpsInsightsService
{
    private readonly LogsQueryClient? _client;
    private readonly string? _workspaceId;
    private readonly ILogger<OpsInsightsService> _logger;

    public OpsInsightsService(IConfiguration configuration, ILogger<OpsInsightsService> logger)
    {
        _logger = logger;
        _workspaceId = configuration["Monitoring:WorkspaceId"];

        var tenantId = configuration["Monitoring:TenantId"];
        var clientId = configuration["Monitoring:ClientId"];
        var clientSecret = configuration["Monitoring:ClientSecret"];

        if (!string.IsNullOrEmpty(tenantId) && !string.IsNullOrEmpty(clientId) && !string.IsNullOrEmpty(clientSecret))
        {
            var credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
            _client = new LogsQueryClient(credential);
        }
    }

    public async Task<OpsSummaryDto?> GetSummaryAsync(TimeSpan window, CancellationToken ct = default)
    {
        if (_client is null || string.IsNullOrEmpty(_workspaceId))
        {
            _logger.LogWarning("Azure Monitor לא מוגדר - חסרים פרטי התחברות (Monitoring:TenantId/ClientId/ClientSecret/WorkspaceId)");
            return null;
        }

        // ב-Application Insights מסוג workspace-based, כשקוראים ל-Log Analytics
        // workspace ישירות שם הטבלה הוא AppRequests (לא requests כמו בתצוגת ה-Logs
        // הקלאסית של משאב ה-App Insights עצמו), עם עמודות Success/DurationMs.
        // משתמשים ב-median (percentile 50) ולא בממוצע, כי בקשות בודדות שהלקוח
        // מתנתק מהן (למשל timeout) יכולות להירשם עם DurationMs קיצוני שמעוות ממוצע רגיל
        const string query = @"
            AppRequests
            | summarize Total = count(), Failed = countif(Success == false), MedianDuration = percentile(DurationMs, 50)";

        var response = await _client.QueryWorkspaceAsync(_workspaceId, query, new QueryTimeRange(window), cancellationToken: ct);

        var row = response.Value.Table.Rows.FirstOrDefault();
        if (row is null)
        {
            return new OpsSummaryDto(0, 0, 0, DateTimeOffset.UtcNow);
        }

        return new OpsSummaryDto(
            TotalRequests: row.GetInt64("Total") ?? 0,
            FailedRequests: row.GetInt64("Failed") ?? 0,
            MedianResponseTimeMs: row.GetDouble("MedianDuration") ?? 0,
            GeneratedAt: DateTimeOffset.UtcNow
        );
    }
}
