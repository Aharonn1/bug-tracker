namespace MyBackendApi.Models.Entities;

// רשומת Dead-Letter: תקרית שנכשלה בעיבוד ב-IncidentIngestionWorker ולא
// נשמרה כ-SystemErrorIncident. לא יורש מ-AuditableEntity בכוונה - זה רשומת
// תפעול/אמינות חוצת-לקוחות, לא נתון עסקי מבודד-לקוח, ולכן גם לא מקבל
// HasQueryFilter ב-AppDbContext - הגישה אליו מוגבלת ברמת ה-Controller בלבד
public class FailedIncidentIngestion
{
    public long Id { get; set; }
    public string TenantId { get; set; } = string.Empty;
    public string DtoJson { get; set; } = string.Empty;
    public string ErrorMessage { get; set; } = string.Empty;
    public DateTime FirstFailedAt { get; set; } = DateTime.UtcNow;
    public DateTime LastAttemptAt { get; set; } = DateTime.UtcNow;
    public int AttemptCount { get; set; } = 1;
    public DateTime? ResolvedAt { get; set; }
}
