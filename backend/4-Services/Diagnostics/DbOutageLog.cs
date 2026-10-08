using System.Collections.Concurrent;

namespace MyBackendApi.Services.Diagnostics;

// TenantId - חובה, לא ברירת מחדל: בלעדיו, DbOutageFlushWorker לא יודע לאיזה
// לקוח לשייך את התקרית כשהיא נפרקת בחזרה (ראה שם) - חייב להיגזר מ-
// ICurrentTenantProvider/CurrentTenantId בנקודת הכשל עצמה, לא מומצא מאוחר יותר
//
// AttemptedEmail - כשהתקלה קרתה בזמן ניסיון login/register, זה היחיד שיש לנו
// כדי לדעת "אצל מי" קרתה הבעיה, כי עוד אין זהות מאומתת באותו רגע.
// ReportedByUserId - לעומת זאת, כשמשתמש כבר מחובר (יש לו JWT תקף) וה-DB נופל
// *תוך כדי* שהוא עובד, יש לנו זהות מאומתת אמיתית - אימות JWT לא דורש DB בכלל
public record DbOutageEntry(
    DateTime OccurredAt,
    string ExceptionType,
    string Message,
    string RequestPath,
    string TenantId,
    string? AttemptedEmail = null,
    int? ReportedByUserId = null);

// יומן זיכרון-בלבד (לא נוגע ב-DB) לתיעוד תקריות "אין גישה לבסיס הנתונים" -
// בכוונה לא כותב ל-SQL, כי בדיוק ברגע שצריך אותו הכי הרבה, ה-SQL הוא מה
// שלא זמין. Singleton כדי שהמצב ישרוד בין בקשות (לא בין הפעלות מחדש של התהליך)
public class DbOutageLog
{
    private const int MaxEntries = 50;
    private readonly ConcurrentQueue<DbOutageEntry> _entries = new();

    public void Record(DbOutageEntry entry)
    {
        _entries.Enqueue(entry);
        while (_entries.Count > MaxEntries && _entries.TryDequeue(out _))
        {
        }
    }

    public bool HasEntries => !_entries.IsEmpty;

    public IReadOnlyList<DbOutageEntry> Snapshot() => _entries.ToArray();

    // מרוקן את כל היומן בבת אחת - נקרא רק כשהצלחנו לוודא שה-DB חזר להיות זמין,
    // כדי "לפרוק" את הרשומות הזמניות האלה כתקריות אמיתיות ומתמשכות
    public List<DbOutageEntry> DrainAll()
    {
        var drained = new List<DbOutageEntry>();
        while (_entries.TryDequeue(out var entry))
        {
            drained.Add(entry);
        }

        return drained;
    }
}
