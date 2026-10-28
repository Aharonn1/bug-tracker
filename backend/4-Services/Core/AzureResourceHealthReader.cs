using System.Net.Http.Headers;
using System.Text.Json;
using Azure.Core;
using Azure.Identity;
using MyBackendApi.Exceptions;
using MyBackendApi.Models.DTOs.Telemetry;

namespace MyBackendApi.Services.Core;

// שואל Microsoft.ResourceHealth/availabilityStatuses עבור משאב ספציפי -
// שונה מ-AzureServiceHealthReader (שם: אירועים ברמת כל ה-subscription).
// כאן: "האם Azure עצמו מסמן את *המשאב הזה בדיוק* כ-Unavailable/Degraded".
// אותו דפוס אימות (ClientSecretCredential + scope של ARM) כמו ה-reader
// האחר - לא משותף בקוד בכוונה, שתי שאלות נפרדות לגמרי על שני APIs שונים
public class AzureResourceHealthReader
{
    private const string ApiVersion = "2022-10-01";

    private readonly ClientSecretCredential? _credential;
    private readonly HttpClient _httpClient;
    private readonly ILogger<AzureResourceHealthReader> _logger;

    public AzureResourceHealthReader(IConfiguration configuration, IHttpClientFactory httpClientFactory, ILogger<AzureResourceHealthReader> logger)
    {
        _logger = logger;
        _httpClient = httpClientFactory.CreateClient();

        var tenantId = configuration["Monitoring:TenantId"];
        var clientId = configuration["Monitoring:ClientId"];
        var clientSecret = configuration["Monitoring:ClientSecret"];

        if (!string.IsNullOrEmpty(tenantId) && !string.IsNullOrEmpty(clientId) && !string.IsNullOrEmpty(clientSecret))
        {
            _credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
        }
    }

    public async Task<ResourceHealthStatusDto?> GetAvailabilityAsync(string? resourceId, CancellationToken ct = default)
    {
        if (_credential is null || string.IsNullOrEmpty(resourceId))
        {
            _logger.LogWarning("Azure Resource Health לא מוגדר - חסרים פרטי התחברות (Monitoring:TenantId/ClientId/ClientSecret) או מזהה משאב");
            return null;
        }

        try
        {
            var token = await _credential.GetTokenAsync(
                new TokenRequestContext(["https://management.azure.com/.default"]), ct);

            var requestUri = $"https://management.azure.com{resourceId}/providers/Microsoft.ResourceHealth/availabilityStatuses/current?api-version={ApiVersion}";
            using var request = new HttpRequestMessage(HttpMethod.Get, requestUri);
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token.Token);

            using var response = await _httpClient.SendAsync(request, ct);
            var body = await response.Content.ReadAsStringAsync(ct);

            if (!response.IsSuccessStatusCode)
            {
                throw new HttpRequestException($"Azure Resource Health החזיר {(int)response.StatusCode}: {body}");
            }

            var parsed = Parse(body);
            if (parsed is null)
            {
                // תגובה מוצלחת (200) אבל בפורמט שלא תואם את מה שציפינו - זה
                // עצמו חריג שראוי להיחשף עם גוף התשובה המלא בלוג, לא "אין
                // מידע" בשקט - אותו עיקרון בדיוק כמו שאר ה-readers בקבוצה הזו
                throw new HttpRequestException($"Azure Resource Health החזיר תשובה בפורמט לא צפוי: {body}");
            }

            return parsed;
        }
        catch (Exception ex) when (ex is not AzureResourceHealthQueryFailedException)
        {
            // כמו שני ה-readers האחרים - זו כנראה בעיית הרשאות (צריך Reader
            // על המשאב/resource group, לא רק Monitoring Reader), לא "אין מידע"
            _logger.LogError(ex, "שאילתת Azure Resource Health נכשלה עבור {ResourceId}", resourceId);
            throw new AzureResourceHealthQueryFailedException(resourceId, ex);
        }
    }

    // מבנה התשובה מתועד יציב (availabilityState/title/summary/reportedTime
    // תחת properties) - עדיין קריאה סלחנית (TryGetProperty), כי כל שלושת
    // ה-readers באותה קבוצה נשארים עמידים לשינוי קל במבנה במקום לקרוס
    private static ResourceHealthStatusDto? Parse(string json)
    {
        using var doc = JsonDocument.Parse(json);
        if (!doc.RootElement.TryGetProperty("properties", out var props)) return null;

        return new ResourceHealthStatusDto(
            AvailabilityState: GetString(props, "availabilityState") ?? "Unknown",
            Title: GetString(props, "title"),
            Summary: GetString(props, "summary"),
            ReportedTime: GetDateTime(props, "reportedTime")
        );
    }

    private static string? GetString(JsonElement el, string prop) =>
        el.TryGetProperty(prop, out var v) && v.ValueKind == JsonValueKind.String ? v.GetString() : null;

    private static DateTimeOffset? GetDateTime(JsonElement el, string prop) =>
        el.TryGetProperty(prop, out var v) && v.ValueKind == JsonValueKind.String
            && DateTimeOffset.TryParse(v.GetString(), out var parsed) ? parsed : null;
}
