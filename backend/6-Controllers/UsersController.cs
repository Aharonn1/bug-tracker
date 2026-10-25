using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using MyBackendApi.Models.DTOs.Auth;
using MyBackendApi.Models.DTOs.Responses;
using MyBackendApi.Services.Auth;
using MyBackendApi.Services.Interfaces;

namespace MyBackendApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UsersController(
    IUserDirectoryService userDirectoryService,
    IAuthService authService,
    ICurrentUserProvider currentUserProvider) : ControllerBase
{
    // SiteAdmin בלבד - הרשימה חוצה-לקוחות (כל המשרדים, לא רק הלקוח של המזמין),
    // אז חשיפה למנהל-משרד רגיל הייתה דליפת מידע ארגוני בין לקוחות
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<UserSummaryDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> GetAllUsers(CancellationToken ct)
    {
        if (!currentUserProvider.IsSiteAdmin)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "רק מנהל-על חוצה-לקוחות יכול לגשת לרשימת המשתמשים המלאה" });
        }

        var users = await userDirectoryService.GetAllUsersAsync(ct);
        return Ok(users);
    }

    // כל משתמש מאומת מסמן את התקריות כנצפו עבור עצמו - אין צורך בהרשאת
    // SiteAdmin, זה פועל רק על הרשומה של המזמין עצמו
    [HttpPost("me/incidents-viewed")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> MarkIncidentsViewed(CancellationToken ct)
    {
        await userDirectoryService.MarkIncidentsViewedAsync(currentUserProvider.UserId!.Value, ct);
        return NoContent();
    }

    // Rate limiting לפי IP (אותה מדיניות "auth" כמו login) - גם כאן מדובר
    // ב-oracle לאימות סיסמה, ולא רוצים לאפשר ניחוש חוזר של הסיסמה הנוכחית
    // רק כי יש בידי התוקף טוקן JWT גנוב, בלי עוד את הסיסמה עצמה
    [HttpPost("me/change-password")]
    [EnableRateLimiting("auth")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequestDto dto, CancellationToken ct)
    {
        await authService.ChangePasswordAsync(currentUserProvider.UserId!.Value, dto, ct);
        return NoContent();
    }
}
