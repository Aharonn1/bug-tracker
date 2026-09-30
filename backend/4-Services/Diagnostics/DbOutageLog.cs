using System.Collections.Concurrent;

namespace MyBackendApi.Services.Diagnostics;

public record DbOutageEntry(DateTime OccurredAt, string ExceptionType, string Message, string RequestPath);

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
