namespace MyBackendApi.Models.DTOs.Telemetry;

// "האם המשאב הספציפי הזה מסומן כ-Unavailable/Degraded מנקודת המבט של Azure
// עצמו" - לא נגזר מהמדדים שלנו (CPU/latency וכו'), וגם לא ברמת subscription
// כמו AzureServiceHealthDto. אירוע פלטפורמה נקודתי שמשפיע רק על המשאב הזה
// יכול להופיע כאן גם בלי שום Service Issue מוכרז פומבית
public record ResourceHealthStatusDto(
    string AvailabilityState,
    string? Title,
    string? Summary,
    DateTimeOffset? ReportedTime
);
