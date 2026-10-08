using System.Net;
using System.Security.Claims;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyBackendApi.Exceptions;
using MyBackendApi.Models.DTOs.Ingestion;
using MyBackendApi.Services.Diagnostics;
using MyBackendApi.Services.Queues;
using MyBackendApi.Services.Tenancy;
using static MyBackendApi.Services.Diagnostics.DatabaseExceptionDetector;

namespace MyBackendApi.Middleware;

public class GlobalExceptionHandler(
    ILogger<GlobalExceptionHandler> logger,
    IncidentChannelQueue incidentQueue,
    DbOutageLog dbOutageLog) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        logger.LogError(exception, "חריגה לא מטופלת נלכדה בצינור הבקשות: {Message}", exception.Message);

        // מיפוי חריגות לקודי HTTP מתאימים
        var (statusCode, title) = exception switch
        {
            BaseNotFoundException => (HttpStatusCode.NotFound, "המשאב המבוקש לא נמצא"),
            InvalidCredentialsException => (HttpStatusCode.Unauthorized, "התחברות נכשלה"),
            EmailAlreadyExistsException => (HttpStatusCode.Conflict, "כתובת אימייל כבר רשומה"),
            MissingTenantException => (HttpStatusCode.BadRequest, "חסר מזהה לקוח בבקשה"),
            AiServiceUnavailableException => (HttpStatusCode.ServiceUnavailable, "שירות ה-AI החיצוני אינו זמין כרגע"),
            DbUpdateConcurrencyException => (HttpStatusCode.Conflict, "התקלה עודכנה בינתיים על ידי משתמש אחר"),
            ArgumentException => (HttpStatusCode.BadRequest, "קלט לא תקין בבקשה"),
            InvalidOperationException => (HttpStatusCode.Conflict, "פעולה בלתי חוקית במצב הנוכחי"),
            _ => (HttpStatusCode.InternalServerError, "שגיאת שרת פנימית בלתי צפויה")
        };

        // לחריגות "מוכרות" (הענפים המפורשים למעלה) ה-Message נכתב בכוונה כטקסט
        // בטוח להצגה ללקוח. אבל לכל מה שנופל ל-InternalServerError - חריגה
        // בלתי צפויה לגמרי, לרוב מ-.NET/SqlClient/קוד צד-שלישי - ה-Message
        // עלול לכלול פרטי מימוש פנימיים (שאילתת SQL, נתיב קובץ, connection
        // string חלקי) שאסור שיגיעו ללקוח. הפרטים המלאים כבר נרשמו ללוג השרת
        // למעלה (logger.LogError) - ללקוח מגיעה רק הודעה גנרית
        var detail = exception switch
        {
            DbUpdateConcurrencyException =>
                "פעולה זו התבססה על נתונים שכבר אינם עדכניים - מישהו אחר עדכן את אותה תקלה בינתיים. רענן את המסך ונסה שוב.",
            _ when statusCode == HttpStatusCode.InternalServerError =>
                "אירעה שגיאה בלתי צפויה בשרת. הצוות הטכני כבר קיבל את הפרטים המלאים.",
            _ => exception.Message
        };

        var problemDetails = new ProblemDetails
        {
            Status = (int)statusCode,
            Title = title,
            Detail = detail,
            Instance = httpContext.Request.Path
        };

        httpContext.Response.StatusCode = problemDetails.Status.Value;
        httpContext.Response.ContentType = "application/problem+json";

        await httpContext.Response.WriteAsJsonAsync(problemDetails, cancellationToken);

        // רק חריגות שבאמת נפלו ל-500 (לא NotFound/ולידציה/קונפליקט ידועים)
        // נחשבות "תקלה" ראויה למעקב - אחרת כל 404/401 צפוי היה מציף את הטבלה
        if (statusCode == HttpStatusCode.InternalServerError)
        {
            // תיעוד ל-DbOutageLog הוא סינכרוני וב-זיכרון בלבד (לא נוגע ב-DB) -
            // בכוונה נפרד מ-TryQueueIncidentAsync למטה, כי אם זו באמת תקלת DB,
            // הניסיון לתעד תקרית רגילה שם עומד להיכשל מאותה סיבה בדיוק.
            // מדלגים כאן על /api/Auth - AuthService כבר מתעד שם בעצמו, עם
            // האימייל שהוקלד בניסיון, כדי לא ליצור שתי רשומות לאותו כשל
            var isAuthEndpoint = httpContext.Request.Path.StartsWithSegments("/api/Auth");
            if (!isAuthEndpoint && IsDatabaseConnectivityException(exception))
            {
                // אם המשתמש כבר מחובר (יש לו JWT תקף) וה-DB נופל *תוך כדי*
                // שהוא עובד - יש לנו זהות מאומתת אמיתית, לא רק אימייל שהוקלד.
                // אימות ה-JWT לא דורש DB בכלל, אז זה עובד גם עכשיו.
                //
                // אותו תיקון בדיוק כמו ב-TryQueueIncidentAsync למטה: חייבים
                // tenantId אמיתי כדי ש-DbOutageFlushWorker ידע מאוחר יותר למי
                // לשייך את התקרית - בלי זה היא הייתה משוייכת בטעות ללקוח קבוע
                // אחד תמיד, בלי קשר למי שבאמת נתקל בתקלה
                try
                {
                    var tenantProvider = httpContext.RequestServices.GetRequiredService<ICurrentTenantProvider>();
                    dbOutageLog.Record(new DbOutageEntry(
                        OccurredAt: DateTime.UtcNow,
                        ExceptionType: exception.GetType().Name,
                        Message: exception.Message,
                        RequestPath: $"{httpContext.Request.Method} {httpContext.Request.Path}",
                        TenantId: tenantProvider.TenantId,
                        ReportedByUserId: GetAuthenticatedUserId(httpContext)
                    ));
                }
                catch
                {
                    // אין זהות מאומתת ואין header - אין למי לשייך, מדלגים על התיעוד
                }
            }

            await TryQueueIncidentAsync(httpContext, exception, cancellationToken);
        }

        // מחזיר true כדי לסמן לצינור שהחריגה טופלה במלואה
        return true;
    }

    private async Task TryQueueIncidentAsync(HttpContext httpContext, Exception exception, CancellationToken ct)
    {
        try
        {
            // ICurrentTenantProvider (לא header גולמי!) - אותו תיקון בדיוק כמו
            // ב-HttpContextTenantProvider: למשתמש מאומת זה שואב מה-JWT החתום,
            // לא מ-header שהלקוח שולח. בלי זה, תוקף יכול היה לגרום ל-500 מכוון
            // (למשל קלט לא תקין) עם X-Tenant-Id מזויף, ולגרום לתקרית "קריסת שרת"
            // להירשם תחת לקוח אחר לגמרי - אותה פרצת בידוד לקוחות, רק בכיוון כתיבה.
            //
            // נשלף מ-httpContext.RequestServices (לא constructor injection!) כי
            // GlobalExceptionHandler עצמו רשום כ-Singleton (כך AddExceptionHandler
            // תמיד רושם IExceptionHandler) בעוד ICurrentTenantProvider הוא Scoped -
            // constructor injection ישיר גרם לקריסה מיידית בעליית השרת
            // ("Cannot consume scoped service from singleton"), כי ה-DI container
            // לא יכול לבנות Singleton שתלוי בשירות שתלוי ב-request הנוכחי.
            // RequestServices הוא ה-scope הנכון של הבקשה הספציפית הזו
            string tenantId;
            try
            {
                var tenantProvider = httpContext.RequestServices.GetRequiredService<ICurrentTenantProvider>();
                tenantId = tenantProvider.TenantId;
            }
            catch
            {
                // אין זהות מאומתת ואין header בכלל - אין למי לשייך את התקרית,
                // אז פשוט מדלגים על תיעוד (התגובה למשתמש כבר נשלחה בכל מקרה)
                return;
            }

            var reportedByUserId = GetAuthenticatedUserId(httpContext);

            await incidentQueue.QueueIncidentAsync(new CreateIncidentDto(
                TenantId: tenantId,
                ErrorCode: "SERVER_UNHANDLED_EXCEPTION",
                CaseNumber: null,
                ExternalReferenceId: null,
                ClientStationId: null,
                UserId: null,
                ErrorMessage: $"{exception.GetType().Name}: {exception.Message}",
                StackTrace: exception.StackTrace,
                RawPayload: $"{httpContext.Request.Method} {httpContext.Request.Path}{httpContext.Request.QueryString}",
                ReportedByUserId: reportedByUserId
            ), ct);
        }
        catch (Exception queueEx)
        {
            // כישלון בתיעוד התקרית לא יכול להפיל את הטיפול בחריגה המקורית -
            // התגובה למשתמש כבר נשלחה, זו רק "בונוס" אם זה נכשל
            logger.LogError(queueEx, "כשל בתיעוד אוטומטי של תקרית עבור חריגה בלתי צפויה");
        }
    }

    private static int? GetAuthenticatedUserId(HttpContext httpContext)
    {
        var userIdValue = httpContext.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return int.TryParse(userIdValue, out var uid) ? uid : null;
    }
}