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
            var component = codeLocationFilePath?.StartsWith("backend/", StringComparison.Ordinal) == true ? "backend"
                : codeLocationFilePath?.StartsWith("frontend/", StringComparison.Ordinal) == true ? "frontend"
                : null;

            if (component is null) return null;

            var lastDeploy = await deploymentHistory.GetLastDeployBeforeAsync(component, incidentCreatedAt, ct);
            return lastDeploy is null
                ? $"אין דיפלוי מתועד של {component} לפני תקרית זו"
                : $"הדיפלוי האחרון של {component} (commit {lastDeploy.CommitSha[..Math.Min(8, lastDeploy.CommitSha.Length)]}) " +
                  $"היה ב-{(incidentCreatedAt - lastDeploy.DeployedAt).TotalMinutes:F0} דקות לפני שהתקרית נראתה לראשונה";
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "לא ניתן היה לקבל הקשר דיפלוי עבור ניתוח תקרית {IncidentId} - ממשיכים בלעדיו", incidentId);
            return null;
        }
    }
}
