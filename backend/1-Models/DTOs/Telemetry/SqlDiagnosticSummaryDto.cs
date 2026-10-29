namespace MyBackendApi.Models.DTOs.Telemetry;

// ספירות אירועים נקודתיים (Deadlocks/Blocks/Errors/Timeouts) בחלון הזמן -
// שונה מהותית מ-DtuPercent/WorkersPercent/SessionsPercent: אלה אחוזי ניצול
// לאורך זמן, אלה מונים של אירועי כשל שקרו בפועל. לא נראה בכלל במדדי
// Azure Monitor הרגילים - מגיע מ-Diagnostic Settings שמוזרמים ל-Log Analytics
public record SqlDiagnosticSummaryDto(
    long ErrorsCount,
    long BlocksCount,
    long DeadlocksCount,
    long TimeoutsCount,
    DateTimeOffset GeneratedAt
);
