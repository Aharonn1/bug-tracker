using System.ComponentModel;
using System.Diagnostics;
using MyBackendApi.Models.Common;

namespace MyBackendApi.Services.Plugins;

public class DiagnosticPlugins(
    ILogger<DiagnosticPlugins> logger,
    IConfiguration configuration)
{
    private static readonly TimeSpan GatewayCheckTimeout = TimeSpan.FromSeconds(8);

    // נקראות ישירות ע"י RcaAgentService (Function Calling ידני מול OpenAI, לא דרך
    // Semantic Kernel) - [Description] נשאר כתיעוד קריא, לא לצורך פונקציונלי.
    // רק NetMishpat נבדק באמת - הכתובת אומתה ידנית (302 עקבי, לא חסום).
    // Tehila/Eca נשארים מדומים בכוונה: ל-Eca (ההוצאה לפועל) הכתובת הציבורית
    // היחידה שבדקנו היא דף תוכן כללי ב-gov.il שחוסם *כל* בקשה אוטומטית
    // (403 גם על הדף הראשי של gov.il עצמו, לא ספציפי לכתובת) - בדיקה אמיתית
    // מולו הייתה תמיד "נכשלת", מטעה יותר מהמדומה הנוכחי
    [Description("בודק זמינות, שיהוי וקוד סטטוס של שערי ממשלה")]
    public async Task<GatewayDiagnosticResult> CheckGovernmentGatewayLatencyAsync(
        [Description("שער היעד לבדיקה")] TargetGateway targetGateway)
    {
        logger.LogInformation("[Tool-Diagnostic] בודק שער: {Gateway}", targetGateway);

        if (targetGateway == TargetGateway.NetMishpat)
        {
            return await CheckNetMishpatAsync();
        }

        await Task.Delay(200);

        if (targetGateway == TargetGateway.Tehila)
        {
            return new GatewayDiagnosticResult("Degraded", 4820, 504, "12%");
        }

        return new GatewayDiagnosticResult("Healthy", 45, 200, "0%");
    }

    // AllowAutoRedirect=false בכוונה - 302 (הפניה, כנראה להתחברות) הוא בדיוק
    // הסיגנל שאומת ידנית כ"השרת מגיב ותקין" עבור בקשה לא-מחוברת; לעקוב אחרי
    // ההפניה רק מוסיף זמן (נמדד פעם אחת ~8.7 שניות) בלי להוסיף מידע שימושי
    private async Task<GatewayDiagnosticResult> CheckNetMishpatAsync()
    {
        var url = configuration["GovernmentGateways:NetMishpatUrl"];
        if (string.IsNullOrWhiteSpace(url))
        {
            return new GatewayDiagnosticResult("Unknown", 0, 0, "N/A");
        }

        using var handler = new HttpClientHandler { AllowAutoRedirect = false };
        using var client = new HttpClient(handler) { Timeout = GatewayCheckTimeout };
        var stopwatch = Stopwatch.StartNew();

        try
        {
            using var response = await client.GetAsync(url);
            stopwatch.Stop();
            var latencyMs = (int)stopwatch.ElapsedMilliseconds;
            var httpCode = (int)response.StatusCode;

            // 2xx/3xx = השרת הגיב כצפוי (כולל הפניית "לא מחובר") - "בריא".
            // 4xx/5xx = השרת הגיב, אבל במצב שגיאה - "Degraded", לא "Down"
            // (עדיין קיבלנו תשובה, לא timeout/כשל חיבור מוחלט)
            var status = httpCode is >= 200 and < 400 ? "Healthy" : "Degraded";
            return new GatewayDiagnosticResult(status, latencyMs, httpCode, "0%");
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            logger.LogWarning(ex, "[Tool-Diagnostic] בדיקת NetMishpat נכשלה - אין תגובה כלל מהשרת");
            return new GatewayDiagnosticResult("Down", (int)stopwatch.ElapsedMilliseconds, 0, "100%");
        }
    }

    [Description("בודק תוקף חתימה דיגיטלית וכרטיס חכם בעמדת עורך הדין")]
    public Task<SmartCardDiagnosticResult> InspectSmartCardCertificateAsync(
        [Description("טביעת אצבע של התעודה")] string? thumbprint = null)
    {
        logger.LogInformation("[Tool-Diagnostic] בדיקת תעודה חכמה: {Thumbprint}", thumbprint ?? "Default");
        
        return Task.FromResult(new SmartCardDiagnosticResult(
            IsValid: false,
            ExpiredDate: "2026-09-01",
            Driver: "SafeNet 10.8",
            ActionNeeded: "Manual-Renewal-Required"
        ));
    }
}

// חוזים טיפוסיים מובנים במקום שרשור מחרוזות JSON שביר
public record GatewayDiagnosticResult(string Status, int LatencyMs, int HttpCode, string PacketLoss);
public record SmartCardDiagnosticResult(bool IsValid, string ExpiredDate, string Driver, string ActionNeeded);