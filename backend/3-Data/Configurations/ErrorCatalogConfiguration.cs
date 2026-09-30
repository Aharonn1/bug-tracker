using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using MyBackendApi.Models.Common;
using MyBackendApi.Models.Entities;

namespace MyBackendApi.Data.Configurations;

public class ErrorCatalogConfiguration : IEntityTypeConfiguration<ErrorCatalog>
{
    public void Configure(EntityTypeBuilder<ErrorCatalog> builder)
    {
        builder.ToTable("ErrorCatalogs");

        builder.HasKey(e => e.ErrorCode);

        builder.Property(e => e.ErrorCode).HasMaxLength(50);
        builder.Property(e => e.Category).HasMaxLength(100).IsRequired();
        builder.Property(e => e.Subsystem).HasMaxLength(100).IsRequired();
        builder.Property(e => e.HebrewDescription).HasMaxLength(255).IsRequired();

        // שמירת ה-Enum כמספר קטן
        builder.Property(e => e.SeverityLevel).IsRequired();

        // קטלוג בסיסי לקודי שגיאה שנוצרים אוטומטית ע"י המערכת עצמה (לא מגיעים
        // משער ממשלתי חיצוני) - בלי רשומה כאן הם מוצגים כ-"General"/"Unknown"
        // בכל מקום שמציג קטגוריה, למרות שהמקור שלהם ידוע וקבוע מראש בקוד
        builder.HasData(new ErrorCatalog
        {
            ErrorCode = "CLIENT_NETWORK_DEGRADED",
            Category = "Client-Side/Network",
            Subsystem = "WebClient",
            SeverityLevel = IncidentSeverity.Medium,
            HebrewDescription = "זוהתה האטה או אובדן חבילות ברשת בעמדת הלקוח (latency גבוה/ping נכשל) - מזוהה אוטומטית ע\"י בדיקת קישוריות בדפדפן",
            ResolutionPlaybook = "1. לבדוק את יציבות חיבור הרשת (Wi-Fi/כבל) בעמדת הלקוח. 2. להפעיל מחדש את הנתב/המחשב. 3. אם ממשיך, לבדוק תחזוקה מתוכננת אצל ספק האינטרנט או VPN פעיל שמאט את התעבורה.",
            TenantId = string.Empty,
            CreatedAt = new DateTime(2026, 9, 28, 0, 0, 0, DateTimeKind.Utc)
        });

        // שני קודים חדשים - מכסים שגיאות שה-ErrorBoundary של React לא תופס בכלל,
        // כי הוא תופס רק שגיאות שקורות בתוך שלב ה-render: שגיאת סקריפט גלובלית
        // (handler רגיל, setTimeout, קוד חיצוני) ו-Promise שנדחה בלי .catch
        builder.HasData(new ErrorCatalog
        {
            ErrorCode = "CLIENT_UNHANDLED_ERROR",
            Category = "Client-Side/Runtime",
            Subsystem = "WebClient",
            SeverityLevel = IncidentSeverity.High,
            HebrewDescription = "שגיאת JavaScript גלובלית בלתי צפויה בדפדפן הלקוח, מחוץ למחזור ה-render של React (למשל בתוך event handler או setTimeout) - מזוהה אוטומטית",
            ResolutionPlaybook = "1. לבדוק את ה-Stack Trace ואת השורה המדויקת שבה קרתה השגיאה. 2. לשחזר את הפעולה שהובילה לשגיאה לפי RawPayload (URL, User Agent). 3. אם זו שגיאה חוזרת, לשקול הוספת בדיקת תקינות (guard clause) בקוד הרלוונטי.",
            TenantId = string.Empty,
            CreatedAt = new DateTime(2026, 9, 30, 0, 0, 0, DateTimeKind.Utc)
        });

        builder.HasData(new ErrorCatalog
        {
            ErrorCode = "SERVER_UNHANDLED_EXCEPTION",
            Category = "Server-Side/Runtime",
            Subsystem = "BackendApi",
            SeverityLevel = IncidentSeverity.Critical,
            HebrewDescription = "חריגה בלתי צפויה נלכדה ב-GlobalExceptionHandler בשרת - קוד השתבש בדרך שלא טופלה מראש (לא NotFound/ולידציה/קונפליקט ידוע). מזוהה אוטומטית מכל בקשת API",
            ResolutionPlaybook = "1. לבדוק את ה-Stack Trace המלא ואת סוג החריגה המדויק (RawPayload כולל את הנתיב והמתודה של הבקשה). 2. לבדוק בלוגים של Application Insights את אותו חלון זמן לפי IncidentId. 3. לתקן את הקוד ולהוסיף טיפול חריגה ספציפי ב-GlobalExceptionHandler אם מדובר בתרחיש שחוזר ועדיין ראוי ל-400/404 ולא ל-500.",
            TenantId = string.Empty,
            CreatedAt = new DateTime(2026, 9, 30, 0, 0, 0, DateTimeKind.Utc)
        });

        builder.HasData(new ErrorCatalog
        {
            ErrorCode = "CLIENT_UNHANDLED_REJECTION",
            Category = "Client-Side/Runtime",
            Subsystem = "WebClient",
            SeverityLevel = IncidentSeverity.High,
            HebrewDescription = "הבטחה (Promise) בקוד הלקוח נדחתה בלי טיפול (.catch) - לרוב מעיד על קריאת API או פעולה אסינכרונית שנכשלה בלי הודעה למשתמש",
            ResolutionPlaybook = "1. לבדוק את הודעת השגיאה ואת ה-Stack Trace אם קיים. 2. לאתר את הקריאה האסינכרונית החסרה בטיפול (fetch/Promise) ולהוסיף .catch מתאים. 3. לוודא שהמשתמש מקבל הודעת שגיאה ברורה במקום שהאפליקציה פשוט 'נתקעת' בשקט.",
            TenantId = string.Empty,
            CreatedAt = new DateTime(2026, 9, 30, 0, 0, 0, DateTimeKind.Utc)
        });

        // כשל שכבר "טופל יפה" בממשק (המשתמש רואה הודעת שגיאה ידידותית או alert,
        // לא קריסה) - בלי הקוד הזה כשלים כאלה פשוט לא נראים למערכת בכלל, למרות
        // שהם מעידים על בעיה אמיתית (רשת/שרת), רק שהיא "שקטה" מבחינת הלקוח
        builder.HasData(new ErrorCatalog
        {
            ErrorCode = "CLIENT_HANDLED_API_FAILURE",
            Category = "Client-Side/API",
            Subsystem = "WebClient",
            SeverityLevel = IncidentSeverity.Medium,
            HebrewDescription = "קריאת API נכשלה אך טופלה בצורה מבוקרת בממשק (המשתמש רואה הודעת שגיאה ידידותית ולא קריסה) - נשמר כדי לעקוב אחרי כשלים חוזרים שהלקוח לא בהכרח מדווח עליהם",
            ResolutionPlaybook = "1. לבדוק את הודעת השגיאה ואת ה-URL שנקרא (RawPayload). 2. אם זו תקרית חוזרת מאותו endpoint, לבדוק את הלוגים בצד השרת לאותו חלון זמן. 3. לוודא שזו לא בעיית רשת זמנית של הלקוח בלבד לפני שפותחים חקירה מעמיקה.",
            TenantId = string.Empty,
            CreatedAt = new DateTime(2026, 9, 30, 0, 0, 0, DateTimeKind.Utc)
        });
    }
}