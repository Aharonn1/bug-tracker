using MyBackendApi.Models.Common;

namespace MyBackendApi.Models.DTOs.Responses;

public record IncidentResponseDto(
    long IncidentId,
    string TenantId,
    string ErrorCode,
    string Category,
    string Subsystem,
    IncidentSeverity Severity,
    IncidentStatus Status,
    string HebrewDescription,
    string? CaseNumber,
    string? ExternalReferenceId,
    string? ClientStationId,
    string? UserId,
    string ErrorMessage,
    string? ResolutionPlaybook,
    string? RecommendedAction,
    string? RootCauseSummary,
    bool IsResolved,
    int OccurrencesCount,
    DateTime CreatedAt,
    DateTime LastSeenAt,
    DateTime? ResolvedAt,
    string? RawPayload,
    string? StackTrace,
    string? CodeLocationFilePath,
    int? CodeLocationLine,
    IReadOnlyList<IncidentReporterDto> ReportedByUsers
);

// כל משתמש שנתקל בתקרית הזו לפחות פעם אחת, כמה פעמים, ומתי לאחרונה.
// Role כלול כדי שהצד-לקוח יוכל להחריג SiteAdmin מתצוגות "פעילות העובדים
// במשרד שלי" - הפעילות שלו היא לרוב בדיקות/ניהול, לא "עובד שנתקל בתקלה"
public record IncidentReporterDto(
    int UserId,
    string UserName,
    UserRole Role,
    int OccurrenceCount,
    DateTime LastSeenAt
);