namespace MyBackendApi.Models.Entities;

// קשר רבים-לרבים בין תקרית למשתמשים - תקרית חוזרת (כמו "רשת איטית") יכולה
// להיתקל על ידי כמה משתמשים שונים לאורך זמן, ואנחנו רוצים לראות את כולם,
// לא רק את מי שנתקל בה לאחרונה
public class IncidentReporter
{
    public long IncidentId { get; set; }
    public int UserId { get; set; }

    public int OccurrenceCount { get; set; } = 1;
    public DateTime LastSeenAt { get; set; } = DateTime.UtcNow;

    public virtual SystemErrorIncident Incident { get; set; } = null!;
    public virtual User User { get; set; } = null!;
}
