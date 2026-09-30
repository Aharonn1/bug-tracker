using System.Net;
using System.Security.Claims;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyBackendApi.Exceptions;
using MyBackendApi.Models.DTOs.Ingestion;
using MyBackendApi.Services.Queues;

namespace MyBackendApi.Middleware;

public class GlobalExceptionHandler(ILogger<GlobalExceptionHandler> logger, IncidentChannelQueue incidentQueue) : IExceptionHandler
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

        var detail = exception is DbUpdateConcurrencyException
            ? "פעולה זו התבססה על נתונים שכבר אינם עדכניים - מישהו אחר עדכן את אותה תקלה בינתיים. רענן את המסך ונסה שוב."
            : exception.Message;

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
            await TryQueueIncidentAsync(httpContext, exception, cancellationToken);
        }

        // מחזיר true כדי לסמן לצינור שהחריגה טופלה במלואה
        return true;
    }

    private async Task TryQueueIncidentAsync(HttpContext httpContext, Exception exception, CancellationToken ct)
    {
        try
        {
            // ה-header המהימן, כמו בכל שאר הבקרים - בלי הוא אין למי לשייך את התקרית,
            // אז פשוט מדלגים על תיעוד (התגובה למשתמש כבר נשלחה בכל מקרה)
            var tenantId = httpContext.Request.Headers["X-Tenant-Id"].FirstOrDefault();
            if (string.IsNullOrWhiteSpace(tenantId)) return;

            var userIdValue = httpContext.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var reportedByUserId = int.TryParse(userIdValue, out var uid) ? uid : (int?)null;

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
}