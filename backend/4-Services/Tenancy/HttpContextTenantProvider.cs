using MyBackendApi.Exceptions;

namespace MyBackendApi.Services.Tenancy;

// מזהה הלקוח (Tenant) הנוכחי נלקח מה-header ששולח ה-Frontend בכל בקשה.
// הערה: זו הפרדה מפני תקלות/דליפה בין לקוחות בשימוש תקין של המערכת - לא הגנה
// מפני לקוח זדוני שמזייף את ה-header, כי אין כרגע מערכת Authentication אמיתית.
public class HttpContextTenantProvider(IHttpContextAccessor httpContextAccessor) : ICurrentTenantProvider
{
    private const string TenantHeaderName = "X-Tenant-Id";

    public string TenantId
    {
        get
        {
            var value = httpContextAccessor.HttpContext?.Request.Headers[TenantHeaderName].FirstOrDefault();

            if (string.IsNullOrWhiteSpace(value))
            {
                throw new MissingTenantException($"חסר header מזהה לקוח ({TenantHeaderName}) בבקשה");
            }

            return value;
        }
    }
}
