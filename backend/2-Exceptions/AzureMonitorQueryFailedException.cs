namespace MyBackendApi.Exceptions;

// נזרקת רק כש*כל* מדדי Azure Monitor נכשלו עבור משאב נתון - כלומר כשל אמיתי
// (הרשאות, credential שגוי, resourceId שגוי), לא "עדיין אין נתונים". בלי זה,
// GET api/Telemetry/*-health-metrics היה מחזיר 200 עם מערכים ריקים שנראה
// זהה לגמרי ל"אין מספיק נתונים להצגת מגמה" - בדיוק מה שהסתיר תקלת הרשאה
// אמיתית (Client ID/Secret לא תואמים, הרשאת Monitoring Reader חסרה) במשך
// ימים, גלוי רק ביומני השרת. עכשיו זה נופל ל-500 דרך GlobalExceptionHandler
// (לא מופה לקוד ספציפי בכוונה) כדי שיהיה מובחן בבירור מ"אין נתונים"
public sealed class AzureMonitorQueryFailedException(string resourceId, Exception innerException)
    : Exception($"כל שאילתות Azure Monitor נכשלו עבור המשאב {resourceId} - כנראה בעיית הרשאות/credential, לא היעדר נתונים בפועל", innerException);
