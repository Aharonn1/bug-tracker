using MyBackendApi.Services.Core;

namespace MyBackendApi.Services.Agent;

// עובדות-עזר משותפות שמוזנות ל-RcaAgentService - מופרד מ-IncidentsController כי
// עכשיו יש שני קוראים (הבקר, לבקשה ידנית; IncidentService, להרצה אוטומטית ברקע
// על תקריות AZURE_PLATFORM_ISSUE חדשות) שצריכים בדיוק את אותה לוגיקה, בלי לשכפל
// אותה. כל מתודה בולעת כשל בשקט (null) - אלו תוספות-עזר לניתוח, לא הליבה שלו
public static class AzureIncidentAiContext
{
    public static async Task<string?> GetActiveServiceHealthSummaryAsync(
        AzureServiceHealthReader serviceHealthReader, ILogger logger, long incidentId, CancellationToken ct)
    {
        try
        {
            var health = await serviceHealthReader.GetActiveEventsAsync(ct);
            if (health is { ActiveEvents.Count: > 0 })
            {
                return string.Join("; ", health.ActiveEvents.Select(e =>
                    $"{e.Title} ({e.EventType}, שירותים מושפעים: {(e.ImpactedServices.Count > 0 ? string.Join(", ", e.ImpactedServices) : "לא צוין")})"));
            }
            return null;
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "לא ניתן היה לבדוק Azure Service Health עבור ניתוח תקרית {IncidentId} - ממשיכים בלעדיו", incidentId);
            return null;
        }
    }

    public static async Task<string?> GetDeployContextSummaryAsync(
        DeploymentHistoryService deploymentHistory,
        string? codeLocationFilePath,
        DateTime incidentCreatedAt,
        long incidentId,
        ILogger logger,
        CancellationToken ct)
    {
        try
        {
            var component = ResolveComponent(codeLocationFilePath);
            if (component is null) return null;

            var lastDeployBefore = await deploymentHistory.GetLastDeployBeforeAsync(component, incidentCreatedAt, ct);
            var beforeSummary = lastDeployBefore is null
                ? $"אין דיפלוי מתועד של {component} לפני תקרית זו"
                : $"הדיפלוי האחרון של {component} (commit {lastDeployBefore.CommitSha[..Math.Min(8, lastDeployBefore.CommitSha.Length)]}) " +
                  $"היה ב-{(incidentCreatedAt - lastDeployBefore.DeployedAt).TotalMinutes:F0} דקות לפני שהתקרית נראתה לראשונה";

            // דיפלויים *אחרי* יצירת התקרית - רמז (לא הוכחה) שהבעיה אולי כבר
            // טופלה: אם קוד ה-component הזה פורס מחדש מאז, קטע הקוד שנשלף
            // מ-GitHub לניתוח הזה עשוי כבר לא לשקף את מה שהיה שבור בפועל
            var deploysSince = await deploymentHistory.GetDeploysSinceAsync(component, incidentCreatedAt, ct);
            var afterSummary = deploysSince.Count == 0
                ? $"לא בוצע דיפלוי נוסף ל-{component} מאז שהתקרית נוצרה"
                : $"בוצעו {deploysSince.Count} דיפלויים נוספים ל-{component} מאז (האחרון לפני " +
                  $"{(DateTime.UtcNow - deploysSince[^1].DeployedAt).TotalHours:F1} שעות) - ייתכן שהקוד השתנה מאז וטופל";

            return $"{beforeSummary}. {afterSummary}";
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "לא ניתן היה לקבל הקשר דיפלוי עבור ניתוח תקרית {IncidentId} - ממשיכים בלעדיו", incidentId);
            return null;
        }
    }

    // לשימוש נקודתי (RunAutoRcaInBackgroundAsync - תקרית בודדת ברקע) - המקבילה
    // ל-IncidentService.ResolveCodeLocationRef, רק בלי לדרוש טעינה מראש של כל
    // טבלת הדיפלויים (שם זה מוצדק כי זה רץ על רשימה שלמה של תקריות, לא אחת)
    public static async Task<string> ResolveCodeLocationRefAsync(
        DeploymentHistoryService deploymentHistory, string? codeLocationFilePath, DateTime incidentCreatedAt, CancellationToken ct)
    {
        var component = ResolveComponent(codeLocationFilePath);
        if (component is null) return "main";

        var lastDeploy = await deploymentHistory.GetLastDeployBeforeAsync(component, incidentCreatedAt, ct);
        return lastDeploy?.CommitSha ?? "main";
    }

    private static string? ResolveComponent(string? codeLocationFilePath) =>
        codeLocationFilePath?.StartsWith("backend/", StringComparison.Ordinal) == true ? "backend"
        : codeLocationFilePath?.StartsWith("frontend/", StringComparison.Ordinal) == true ? "frontend"
        : null;
}
