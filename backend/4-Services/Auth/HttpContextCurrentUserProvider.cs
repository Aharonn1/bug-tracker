using System.Security.Claims;
using MyBackendApi.Models.Common;

namespace MyBackendApi.Services.Auth;

// המשתמש הנוכחי נגזר מה-JWT (Claims), אם קיים ותקין - לא כל בקשה מחייבת [Authorize]
// (למשל TelemetryController), ולכן UserId חייב להיות nullable ולא לזרוק כשאין טוקן
public class HttpContextCurrentUserProvider(IHttpContextAccessor httpContextAccessor) : ICurrentUserProvider
{
    public int? UserId
    {
        get
        {
            var value = httpContextAccessor.HttpContext?.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return int.TryParse(value, out var id) ? id : null;
        }
    }

    public bool IsAdmin =>
        httpContextAccessor.HttpContext?.User?.IsInRole(nameof(UserRole.Admin)) == true;
}
