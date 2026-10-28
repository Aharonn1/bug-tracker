using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using MyBackendApi.Models.DTOs.Ingestion;
using MyBackendApi.Services.Queues;

namespace MyBackendApi.Controllers;

// מקבל webhook מ-Azure Monitor Alert (Action Group) כש-Service Health
// מכריז על תקלה - "push", לא "pull" כמו AzureServiceHealthReader. נפרד
// לגמרי מ-IncidentsController.IngestIncident (ה-/ingest הרגיל) כי זה
// סומך על X-Tenant-Id שמגיע מהלקוח - כאן אין "לקוח" במובן הזה, Azure לא
// שולח header כזה, אז ה-tenant קבוע בקוד (זו לא תקלה ספציפית ללקוח כלשהו)
[ApiController]
[Route("api/azure-alerts")]
[AllowAnonymous]
[EnableRateLimiting("ingest")]
public class AzureAlertsController(
    IncidentChannelQueue queue,
    IConfiguration configuration,
    ILogger<AzureAlertsController> logger) : ControllerBase
{
    private const string PlatformTenantId = "default-tenant";

    /// <summary>
    /// נקודת הכניסה שמוגדרת כ-URL של ה-Webhook ב-Action Group. אימות בטוקן
    /// סודי ב-query string (לא header) - Action Group מסוג "Webhook" הרגיל
    /// תומך בכתובת מלאה בלבד, לא ב-headers מותאמים-אישית
    /// </summary>
    [HttpPost("service-health")]
    [ProducesResponseType(StatusCodes.Status202Accepted)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> ReceiveServiceHealthAlert(
        [FromQuery] string? token,
        CancellationToken ct)
    {
        var expectedToken = configuration["Monitoring:WebhookSecret"];
        if (string.IsNullOrEmpty(expectedToken) || !ConstantTimeEquals(token, expectedToken))
        {
            logger.LogWarning("נדחתה בקשת webhook ל-Azure Service Health עם טוקן לא תקף");
            return Unauthorized();
        }

        using var reader = new StreamReader(Request.Body);
        var body = await reader.ReadToEndAsync(ct);

        var summary = ParseAlertSummary(body);

        await queue.QueueIncidentAsync(new CreateIncidentDto(
            TenantId: PlatformTenantId,
            ErrorCode: "AZURE_PLATFORM_ISSUE",
            CaseNumber: null,
            ExternalReferenceId: null,
            ClientStationId: null,
            UserId: null,
            ErrorMessage: summary,
            StackTrace: null,
            RawPayload: body
        ), ct);

        return Accepted();
    }

    private static bool ConstantTimeEquals(string? actual, string expected)
    {
        if (string.IsNullOrEmpty(actual)) return false;
        var actualBytes = Encoding.UTF8.GetBytes(actual);
        var expectedBytes = Encoding.UTF8.GetBytes(expected);
        // אורכים שונים כבר לא שווים - FixedTimeEquals דורש אורך זהה, אבל
        // ההשוואה הזו עצמה (על האורך) לא דולפת מידע משמעותי על התוכן
        return actualBytes.Length == expectedBytes.Length && CryptographicOperations.FixedTimeEquals(actualBytes, expectedBytes);
    }

    // מבנה ה-payload הוא "Common Alert Schema" של Azure Monitor - מתועד,
    // אבל לא מאומת כאן מול תשובה חיה (אין עדיין Alert Rule מוגדר בפועל).
    // קריאה סלחנית (TryGetProperty בכל שלב): אם שדה חסר או שהמבנה משתנה,
    // עדיין נוצרת תקרית עם ה-RawPayload המלא לבדיקה ידנית, לא נזרקת שגיאה
    private static string ParseAlertSummary(string json)
    {
        try
        {
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;

            if (root.TryGetProperty("data", out var data) && data.TryGetProperty("essentials", out var essentials))
            {
                var description = GetString(essentials, "description");
                var severity = GetString(essentials, "severity");
                var alertRule = GetString(essentials, "alertRule");

                if (!string.IsNullOrWhiteSpace(description))
                {
                    return severity is not null ? $"[{severity}] {description}" : description;
                }
                if (!string.IsNullOrWhiteSpace(alertRule))
                {
                    return alertRule;
                }
            }
        }
        catch (JsonException)
        {
            // לא JSON תקין בכלל - עדיין נרשם כתקרית, עם ה-RawPayload הגולמי
        }

        return "התקבל Alert מ-Azure Service Health (ראה RawPayload לפרטים המלאים)";
    }

    private static string? GetString(JsonElement el, string prop) =>
        el.TryGetProperty(prop, out var v) && v.ValueKind == JsonValueKind.String ? v.GetString() : null;
}
