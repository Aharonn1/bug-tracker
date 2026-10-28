using System.Text.Json;
using Azure.Core;
using Azure.Identity;
using MyBackendApi.Exceptions;
using MyBackendApi.Models.DTOs.Telemetry;

namespace MyBackendApi.Services.Core;

// שואל את Azure Service Health (Microsoft.ResourceHealth/events) ברמת ה-
// subscription - לא מדד שנגזר מהמשאבים שלנו (כמו AzureResourceMetricsReader),
// אלא תקלה שמיקרוסופט עצמה מכריזה עליה באזור/בשירות שלנו. אותו Service
// Principal כמו שאר ה-Monitoring:* (ClientSecretCredential), אבל עם scope
// של ARM (management.azure.com) ולא של Azure Monitor - ה-SDK הייעודי
// (Azure.ResourceManager.ResourceHealth) לא מותקן, קריאת REST ישירה
// עם HttpClient חוסכת תלות נוספת למשהו שהוא בעצם GET אחד פשוט
public class AzureServiceHealthReader
{
    private const string ApiVersion = "2022-10-01";

    private readonly ClientSecretCredential? _credential;
    private readonly string? _subscriptionId;
    private readonly HttpClient _httpClient;
    private readonly ILogger<AzureServiceHealthReader> _logger;

    public AzureServiceHealthReader(IConfiguration configuration, IHttpClientFactory httpClientFactory, ILogger<AzureServiceHealthReader> logger)
    {
        _logger = logger;
        _httpClient = httpClientFactory.CreateClient();

        var tenantId = configuration["Monitoring:TenantId"];
        var clientId = configuration["Monitoring:ClientId"];
        var clientSecret = configuration["Monitoring:ClientSecret"];
        _subscriptionId = configuration["Monitoring:SubscriptionId"];

        if (!string.IsNullOrEmpty(tenantId) && !string.IsNullOrEmpty(clientId) && !string.IsNullOrEmpty(clientSecret))
        {
            _credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
        }
    }

    public async Task<AzureServiceHealthDto?> GetActiveEventsAsync(CancellationToken ct = default)
    {
        if (_credential is null || string.IsNullOrEmpty(_subscriptionId))
        {
            _logger.LogWarning("Azure Service Health לא מוגדר - חסרים פרטי התחברות (Monitoring:TenantId/ClientId/ClientSecret) או Monitoring:SubscriptionId");
            return null;
        }

        try
        {
            var token = await _credential.GetTokenAsync(
                new TokenRequestContext(["https://management.azure.com/.default"]), ct);

            var requestUri = $"https://management.azure.com/subscriptions/{_subscriptionId}/providers/Microsoft.ResourceHealth/events?api-version={ApiVersion}";
            using var request = new HttpRequestMessage(HttpMethod.Get, requestUri);
            request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token.Token);

            using var response = await _httpClient.SendAsync(request, ct);
            var body = await response.Content.ReadAsStringAsync(ct);

            if (!response.IsSuccessStatusCode)
            {
                throw new HttpRequestException($"Azure Service Health החזיר {(int)response.StatusCode}: {body}");
            }

            var events = ParseActiveEvents(body);
            return new AzureServiceHealthDto(events, DateTimeOffset.UtcNow);
        }
        catch (Exception ex) when (ex is not AzureServiceHealthQueryFailedException)
        {
            // כמו AzureMonitorQueryFailedException - זו כנראה בעיית הרשאות
            // (ה-Service Principal צריך תפקיד Reader על ה-subscription, לא
            // רק Monitoring Reader על משאב ספציפי), לא "אין תקלות כרגע"
            _logger.LogError(ex, "שאילתת Azure Service Health נכשלה");
            throw new AzureServiceHealthQueryFailedException(ex);
        }
    }

    // מבנה התשובה של Microsoft.ResourceHealth/events לא מתועד בצורה חזקה
    // (אין SDK רשמי מותקן) - קריאה סלחנית (TryGetProperty בכל שלב) כדי
    // שפרטים חסרים לא יפילו את כל הפענוח, רק ישאירו שדה ריק. כדאי לאמת
    // את המבנה בפועל מול תשובה חיה אחרי הפריסה הראשונה
    private static IReadOnlyList<ServiceHealthEventDto> ParseActiveEvents(string json)
    {
        var result = new List<ServiceHealthEventDto>();
        using var doc = JsonDocument.Parse(json);

        if (!doc.RootElement.TryGetProperty("value", out var items)) return result;

        foreach (var item in items.EnumerateArray())
        {
            if (!item.TryGetProperty("properties", out var props)) continue;

            var status = GetString(props, "status") ?? GetString(props, "Status");
            if (!string.Equals(status, "Active", StringComparison.OrdinalIgnoreCase)) continue;

            var impactedServices = new List<string>();
            if (props.TryGetProperty("impact", out var impact) && impact.ValueKind == JsonValueKind.Array)
            {
                foreach (var impactItem in impact.EnumerateArray())
                {
                    var svc = GetString(impactItem, "impactedService") ?? GetString(impactItem, "ImpactedService");
                    if (!string.IsNullOrWhiteSpace(svc)) impactedServices.Add(svc);
                }
            }

            result.Add(new ServiceHealthEventDto(
                EventType: GetString(props, "eventType") ?? GetString(props, "EventType") ?? "Unknown",
                Status: status ?? "Unknown",
                Title: GetString(props, "title") ?? GetString(props, "Title") ?? "ללא כותרת",
                Summary: GetString(props, "summary") ?? GetString(props, "Summary"),
                LastUpdateTime: GetDateTime(props, "lastUpdateTime") ?? GetDateTime(props, "LastUpdateTime"),
                ImpactedServices: impactedServices
            ));
        }

        return result;
    }

    private static string? GetString(JsonElement el, string prop) =>
        el.TryGetProperty(prop, out var v) && v.ValueKind == JsonValueKind.String ? v.GetString() : null;

    private static DateTimeOffset? GetDateTime(JsonElement el, string prop) =>
        el.TryGetProperty(prop, out var v) && v.ValueKind == JsonValueKind.String
            && DateTimeOffset.TryParse(v.GetString(), out var parsed) ? parsed : null;
}
