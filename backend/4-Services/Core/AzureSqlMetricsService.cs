using Azure.Identity;
using Azure.Monitor.Query;
using Azure.Monitor.Query.Models;
using MyBackendApi.Models.DTOs.Telemetry;

namespace MyBackendApi.Services.Core;

// קורא ישירות ממדדי הפלטפורמה של Azure SQL Database (DTU/Workers/Sessions) -
// משתמש באותו Service Principal שכבר קיים עבור OpsInsightsService
// (Monitoring:TenantId/ClientId/ClientSecret), רק עם תפקיד "Monitoring Reader"
// שצריך להיות מוקצה גם על משאב ה-SQL (או ה-resource group) כדי שזה יעבוד
public class AzureSqlMetricsService
{
    private readonly MetricsQueryClient? _client;
    private readonly string? _resourceId;
    private readonly ILogger<AzureSqlMetricsService> _logger;

    private static readonly string[] MetricNames = ["dtu_consumption_percent", "workers_percent", "sessions_percent"];

    public AzureSqlMetricsService(IConfiguration configuration, ILogger<AzureSqlMetricsService> logger)
    {
        _logger = logger;
        _resourceId = configuration["Monitoring:SqlResourceId"];

        var tenantId = configuration["Monitoring:TenantId"];
        var clientId = configuration["Monitoring:ClientId"];
        var clientSecret = configuration["Monitoring:ClientSecret"];

        if (!string.IsNullOrEmpty(tenantId) && !string.IsNullOrEmpty(clientId) && !string.IsNullOrEmpty(clientSecret))
        {
            var credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
            _client = new MetricsQueryClient(credential);
        }
    }

    public async Task<SqlHealthMetricsDto?> GetSqlHealthAsync(TimeSpan window, CancellationToken ct = default)
    {
        if (_client is null || string.IsNullOrEmpty(_resourceId))
        {
            _logger.LogWarning("Azure Monitor למדדי SQL לא מוגדר - חסרים פרטי התחברות (Monitoring:TenantId/ClientId/ClientSecret/SqlResourceId)");
            return null;
        }

        var options = new MetricsQueryOptions
        {
            TimeRange = new QueryTimeRange(window),
            Granularity = TimeSpan.FromMinutes(5),
        };
        options.Aggregations.Add(MetricAggregationType.Average);

        var response = await _client.QueryResourceAsync(_resourceId, MetricNames, options, ct);

        List<MetricPointDto> Extract(string metricName)
        {
            var metric = response.Value.Metrics.FirstOrDefault(m => m.Name == metricName);
            if (metric is null) return [];

            return metric.TimeSeries
                .SelectMany(ts => ts.Values)
                .Select(v => new MetricPointDto(v.TimeStamp, v.Average))
                .OrderBy(p => p.Timestamp)
                .ToList();
        }

        return new SqlHealthMetricsDto(
            DtuPercent: Extract("dtu_consumption_percent"),
            WorkersPercent: Extract("workers_percent"),
            SessionsPercent: Extract("sessions_percent"),
            GeneratedAt: DateTimeOffset.UtcNow
        );
    }
}
