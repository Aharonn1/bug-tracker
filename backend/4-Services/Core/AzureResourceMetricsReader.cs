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

        try
        {
            var response = await _client.QueryResourceAsync(resourceId, metricNames, options, ct);
            return Extract(response.Value.Metrics, metricNames);
        }
        catch (Exception ex)
        {
            // Azure Monitor פוסל את כל הבקשה אם אפילו שם מדד אחד מתוך הרשימה
            // לא נתמך למשאב הזה (למשל מדד שקיים ל-App Service על Windows אבל
            // לא על Linux) - אז נופלים חזרה לשאילתה נפרדת לכל מדד בנפרד, כדי
            // שמדד תקין אחד לא ימנע מכל השאר להישלף
            _logger.LogWarning(ex, "שאילתת Azure Monitor מרוכזת נכשלה עבור {ResourceId} - נופל לשאילתות נפרדות לכל מדד", resourceId);

            var result = new Dictionary<string, List<MetricPointDto>>();
            foreach (var metricName in metricNames)
            {
                try
                {
                    var single = await _client.QueryResourceAsync(resourceId, [metricName], options, ct);
                    var extracted = Extract(single.Value.Metrics, [metricName]);
                    result[metricName] = extracted[metricName];
                }
                catch (Exception singleEx)
                {
                    _logger.LogWarning(singleEx, "מדד {MetricName} לא נתמך או נכשל עבור {ResourceId} - מדולג", metricName, resourceId);
                    result[metricName] = [];
                }
            }
            return result;
        }
    }

    private static Dictionary<string, List<MetricPointDto>> Extract(IReadOnlyList<MetricResult> metrics, IReadOnlyList<string> metricNames)
    {
        var result = new Dictionary<string, List<MetricPointDto>>();
        foreach (var metricName in metricNames)
        {
            var metric = metrics.FirstOrDefault(m => m.Name == metricName);
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
