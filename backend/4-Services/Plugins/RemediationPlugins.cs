using System.ComponentModel;
using Microsoft.SemanticKernel;

namespace MyBackendApi.Services.Plugins;

public class RemediationPlugins(ILogger<RemediationPlugins> logger)
{
    [KernelFunction, Description("משחרר נעילת קובץ מסמך שתקוע בזיכרון של מערכת בתי המשפט")]
    public async Task<RemediationExecutionResult> ExecuteReleaseDocumentLockAsync(
        [Description("מספר התיק שבו הנעילה קיימת")] string caseNumber)
    {
        logger.LogInformation("[Tool-Remediation] משחרר נעילה על תיק: {CaseNumber}", caseNumber);
        
        await Task.Delay(300); // הדמיית קריאה ל-I/O או מנוע מסמכים

        return new RemediationExecutionResult(
            Success: true,
            Action: "FileLockReleased",
            TargetResource: caseNumber,
            ExecutedAt: DateTime.UtcNow,
            JobId: Guid.NewGuid().ToString("N")
        );
    }

    [KernelFunction, Description("מזניק ריצת סנכרון יזום (Batch Re-sync) מול שערי רשות האכיפה או נט המשפט")]
    public async Task<RemediationExecutionResult> ExecuteBatchResyncQueueAsync(
        [Description("שם תת המערכת לסנכרון (למשל NetMishpat או ECA)")] string subsystem,
        [Description("מספר תיק ייעודי או כללי")] string? caseNumber)
    {
        logger.LogInformation("[Tool-Remediation] מפעיל סנכרון יזום עבור {Subsystem}, תיק: {CaseNumber}", 
            subsystem, caseNumber ?? "All");
        
        await Task.Delay(400); // הדמיית שליחת פקודה ל-Message Queue / Bus

        return new RemediationExecutionResult(
            Success: true,
            Action: "BatchResyncTriggered",
            TargetResource: $"{subsystem}:{(caseNumber ?? "FullQueue")}",
            ExecutedAt: DateTime.UtcNow,
            JobId: Guid.NewGuid().ToString("N")
        );
    }
}

// חוזה פלט מובנה לכל פעולות התיקון
public record RemediationExecutionResult(
    bool Success,
    string Action,
    string TargetResource,
    DateTime ExecutedAt,
    string JobId
);