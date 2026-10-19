namespace MyBackendApi.Models.Entities;

public enum LoginAttemptOutcome
{
    Success,
    InvalidCredentials,
    UnknownEmail,
    AccountLocked,
    IpBlocked
}

// יומן ביקורת לניסיונות התחברות - ישות תפעולית/אבטחתית חוצת-לקוחות, לא
// נתון עסקי per-tenant (לכן לא AuditableEntity, אותה החלטה בדיוק כמו
// FailedIncidentIngestion). TenantId נשמר כשדה מידע רגיל בלבד, לא לסינון
public class LoginAttempt
{
    public long Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string IpAddress { get; set; } = string.Empty;
    public string? TenantId { get; set; }
    public LoginAttemptOutcome Outcome { get; set; }
    public DateTime AttemptedAt { get; set; } = DateTime.UtcNow;
}
