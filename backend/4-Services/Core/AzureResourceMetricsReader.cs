using Azure.Identity;
using Azure.Monitor.Query;
using Azure.Monitor.Query.Models;
using MyBackendApi.Models.DTOs.Telemetry;

namespace MyBackendApi.Services.Core;

// עוטף את ה-Service Principal המשותף (Monitoring:TenantId/ClientId/ClientSecret)
// וקריאה גנרית למדדי פלטפורמה של כל משאב Azure - משותף בין AzureSqlMetricsService
// ו-AzureAppServiceMetricsService כדי לא לכפול את לוגיקת ההתחברות וה-credential
public class AzureResourceMetricsReader
{
    private readonly MetricsQueryClient? _client;
    private readonly ILogger<AzureResourceMetricsReader> _logger;

    public AzureResourceMetricsReader(IConfiguration configuration, ILogger<AzureResourceMetricsReader> logger)
    {
        _logger = logger;

        var tenantId = configuration["Monitoring:TenantId"];
        var clientId = configuration["Monitoring:ClientId"];
        var clientSecret = configuration["Monitoring:ClientSecret"];

        if (!string.IsNullOrEmpty(tenantId) && !string.IsNullOrEmpty(clientId) && !string.IsNullOrEmpty(clientSecret))
        {
            var credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
            _client = new MetricsQueryClient(credential);
        }
    }

    public async Task<Dictionary<string, List<MetricPointDto>>?> QueryAsync(
        string? resourceId,
        IReadOnlyList<string> metricNames,
        TimeSpan window,
        CancellationToken ct = default)
    {
        if (_client is null || string.IsNullOrEmpty(resourceId))
        {
            _logger.LogWarning("Azure Monitor לא מוגדר - חסרים פרטי התחברות (Monitoring:TenantId/ClientId/ClientSecret) או מזהה משאב");
            return null;
        }

        var options = new MetricsQueryOptions
        {
            TimeRange = new QueryTimeRange(window),
            Granularity = TimeSpan.FromMinutes(5),
        };
        options.Aggregations.Add(MetricAggregationType.Average);

        var response = await _client.QueryResourceAsync(resourceId, metricNames, options, ct);

        var result = new Dictionary<string, List<MetricPointDto>>();
        foreach (var metricName in metricNames)
        {
            var metric = response.Value.Metrics.FirstOrDefault(m => m.Name == metricName);
            result[metricName] = metric is null
                ? []
                : metric.TimeSeries
                    .SelectMany(ts => ts.Values)
                    .Select(v => new MetricPointDto(v.TimeStamp, v.Average))
                    .OrderBy(p => p.Timestamp)
                    .ToList();
        }

        return result;
    }
}
