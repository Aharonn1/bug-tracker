using System.Net;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyBackendApi.Exceptions;

namespace MyBackendApi.Middleware;

public class GlobalExceptionHandler(ILogger<GlobalExceptionHandler> logger) : IExceptionHandler
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

        // מחזיר true כדי לסמן לצינור שהחריגה טופלה במלואה
        return true;
    }
}