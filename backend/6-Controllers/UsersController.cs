using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MyBackendApi.Models.DTOs.Responses;
using MyBackendApi.Services.Auth;
using MyBackendApi.Services.Interfaces;

namespace MyBackendApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UsersController(IUserDirectoryService userDirectoryService, ICurrentUserProvider currentUserProvider) : ControllerBase
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
}
