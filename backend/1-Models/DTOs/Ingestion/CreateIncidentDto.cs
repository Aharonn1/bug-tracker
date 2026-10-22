using System.ComponentModel.DataAnnotations;

namespace MyBackendApi.Models.DTOs.Ingestion;

public record CreateIncidentDto(
    [Required] string TenantId,
    [Required] string ErrorCode,
    string? CaseNumber,
    string? ExternalReferenceId,
    string? ClientStationId,
    string? UserId,
    [Required] string ErrorMessage,
    string? StackTrace,
    string? RawPayload,
    int? ReportedByUserId = null,
    // ממוקם ע"י הלקוח (צד-לקוח בלבד - תקריות שרת ממילא מחושבות מה-StackTrace
    // ב-StackTraceLocationParser): נתיב וקו בקובץ המקור המקורי, אחרי פענוח
    // Source Map של stack trace מכווץ. אותה רמת אמון בדיוק כמו StackTrace/
    // RawPayload - שדה טקסט חופשי שכבר מתקבל ללא אימות ב-endpoint הזה
    string? CodeLocationFilePath = null,
    int? CodeLocationLine = null
);