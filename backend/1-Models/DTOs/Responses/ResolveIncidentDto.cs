namespace MyBackendApi.Models.DTOs.Responses;

// ResolutionNotes אופציונלי בכוונה - לא רוצים לחסום סגירה מהירה של תקרית
// של-type שהתשובה עליה ברורה (למשל "false positive"), רק לעודד תיעוד
public record ResolveIncidentDto(string? ResolutionNotes);
