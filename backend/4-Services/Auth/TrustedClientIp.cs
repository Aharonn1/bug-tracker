using System.Net;

namespace MyBackendApi.Services.Auth;

// X-Client-IP נקבע ע"י ה-Front End Role של Azure App Service עצמו, ברמת
// הפלטפורמה - נדרס (overwrite) תמיד, לקוח חיצוני לא יכול לזייף אותו
// (מתועד ע"י Microsoft: github.com/Azure/app-service-linux-docs,
// Things_You_Should_Know/headers.md). לעומת זאת X-Forwarded-For הוא כותרת
// רגילה שכל לקוח יכול לשלוח בעצמו - הגבלת-הקצב וחסימת ה-IP נגד brute-force
// הסתמכו עליה בעבר, ואומת אמפירית שזה אפשר לעקוף אותן: אותה בקשה בדיוק,
// רק עם X-Forwarded-For שונה, עברה חסימת IP פעילה בהצלחה
public static class TrustedClientIp
{
    public static string Resolve(HttpContext context)
    {
        var header = context.Request.Headers["X-Client-IP"].FirstOrDefault();
        if (!string.IsNullOrWhiteSpace(header) && IPAddress.TryParse(header, out _))
        {
            return header;
        }

        // נופל חזרה ל-RemoteIpAddress - רלוונטי לפיתוח מקומי, בלי שכבת
        // Azure App Service שמציבה את X-Client-IP
        return context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
    }
}
