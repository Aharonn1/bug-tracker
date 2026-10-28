namespace MyBackendApi.Models.DTOs.Telemetry;

// אירוע Service Health פעיל (ServiceIssue/PlannedMaintenance/HealthAdvisory) -
// תקלה שמיקרוסופט עצמה מכריזה עליה ברמת ה-subscription/אזור, לא משהו
// שנגזר ממדדים שלנו. שונה מהותית מ-AppServiceHealthMetricsDto/SqlHealthMetricsDto:
// אלה שואלים "האם המשאב שלנו מגיב", זה שואל "האם ל-Azure עצמו יש תקלה"
public record ServiceHealthEventDto(
    string EventType,
    string Status,
    string Title,
    string? Summary,
    DateTimeOffset? LastUpdateTime,
    IReadOnlyList<string> ImpactedServices
);

public record AzureServiceHealthDto(
    IReadOnlyList<ServiceHealthEventDto> ActiveEvents,
    DateTimeOffset GeneratedAt
);
