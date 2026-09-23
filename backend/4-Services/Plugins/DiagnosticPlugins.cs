using System.ComponentModel;
using Microsoft.SemanticKernel;
using MyBackendApi.Models.Common;

namespace MyBackendApi.Services.Plugins;

public class DiagnosticPlugins(ILogger<DiagnosticPlugins> logger)
{
    [KernelFunction, Description("בודק זמינות, שיהוי וקוד סטטוס של שערי ממשלה")]
    public async Task<GatewayDiagnosticResult> CheckGovernmentGatewayLatencyAsync(
        [Description("שער היעד לבדיקה")] TargetGateway targetGateway)
    {
        logger.LogInformation("[Tool-Diagnostic] בודק שער: {Gateway}", targetGateway);
        await Task.Delay(200);

        if (targetGateway is TargetGateway.Tehila or TargetGateway.NetMishpat)
        {
            return new GatewayDiagnosticResult("Degraded", 4820, 504, "12%");
        }

        return new GatewayDiagnosticResult("Healthy", 45, 200, "0%");
    }

    [KernelFunction, Description("בודק תוקף חתימה דיגיטלית וכרטיס חכם בעמדת עורך הדין")]
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