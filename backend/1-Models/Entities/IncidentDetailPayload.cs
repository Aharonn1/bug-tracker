using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MyBackendApi.Models.Entities;

[Table("IncidentDetailPayloads")]
public class IncidentDetailPayload
{
    [Key]
    public long IncidentId { get; set; }

    public string? StackTrace { get; set; }

    public string? RawPayload { get; set; }

    // ממוקם ע"י הלקוח (אחרי פענוח Source Map בצד-הדפדפן) - נפרד מ-StackTrace
    // הגולמי, כי תקריות שרת (.NET) ממילא לא ממלאות את זה, ה-FilePath/Line
    // שלהן מחושבים דינמית מה-StackTrace עצמו ב-StackTraceLocationParser
    public string? ClientCodeLocationFilePath { get; set; }

    public int? ClientCodeLocationLine { get; set; }

    [ForeignKey(nameof(IncidentId))]
    public virtual SystemErrorIncident Incident { get; set; } = null!;
}