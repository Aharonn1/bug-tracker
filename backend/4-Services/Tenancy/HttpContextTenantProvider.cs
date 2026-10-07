using MyBackendApi.Exceptions;

namespace MyBackendApi.Services.Tenancy;

// מזהה הלקוח (Tenant) הנוכחי - אם יש משתמש מאומת (JWT תקף), נשענים תמיד על
// ה-claim "tenantId" שחתום בתוך הטוקן, ולא על header שהלקוח שולח. זה מה שסוגר
// את בידוד הלקוחות בפועל: לפני התיקון הזה, כל משתמש מחובר יכול היה לשנות את
// ה-header X-Tenant-Id ולקרוא/לכתוב נתונים של לקוח אחר לגמרי, כי ה-Global Query
// Filter (ב-AppDbContext) סמך על הערך הזה בלי שום אימות מול הזהות המאומתת.
//
// ה-header עדיין משמש fallback רק כשאין משתמש מאומת בכלל (login, register,
// דיווח תקלה אנונימי לפני התחברות) - שם אין עדיין JWT לסמוך עליו מעצם הגדרת
// הזרימה, וזה בסדר: ההיקף של "מה ניתן לעשות" שם הרבה יותר מצומצם (לא קריאת
// נתונים קיימים של לקוח אחר, לכל היותר כתיבת רעש)
public class HttpContextTenantProvider(IHttpContextAccessor httpContextAccessor) : ICurrentTenantProvider
{
    private const string TenantHeaderName = "X-Tenant-Id";
    private const string TenantClaimType = "tenantId";

    public string TenantId
    {
        get
        {
            var context = httpContextAccessor.HttpContext;

            var claimValue = context?.User?.FindFirst(TenantClaimType)?.Value;
            if (!string.IsNullOrWhiteSpace(claimValue))
            {
                return claimValue;
            }

            var headerValue = context?.Request.Headers[TenantHeaderName].FirstOrDefault();

            if (string.IsNullOrWhiteSpace(headerValue))
            {
                throw new MissingTenantException($"חסר header מזהה לקוח ({TenantHeaderName}) בבקשה, ואין משתמש מאומת עם tenantId בטוקן");
            }

            return headerValue;
        }
    }
}
