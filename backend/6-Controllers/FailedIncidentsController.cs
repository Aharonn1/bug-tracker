using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MyBackendApi.Models.DTOs.Responses;
using MyBackendApi.Services.Auth;
using MyBackendApi.Services.Interfaces;

namespace MyBackendApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class FailedIncidentsController(
    IFailedIncidentService failedIncidentService,
    ICurrentUserProvider currentUserProvider) : ControllerBase
{
    // SiteAdmin בלבד - תור ה-Dead-Letter הוא כלי תפעול חוצה-לקוחות, לא נתון
    // עסקי שרלוונטי למנהל משרד רגיל
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<FailedIncidentSummaryDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> GetUnresolved(CancellationToken ct)
    {
        if (!currentUserProvider.IsSiteAdmin)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "רק מנהל-על יכול לגשת לתור התקריות שנכשלו" });
        }

        return Ok(await failedIncidentService.GetUnresolvedAsync(ct));
    }

    [HttpPost("{id:long}/retry")]
    [ProducesResponseType(typeof(FailedIncidentRetryResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RetryNow([FromRoute] long id, CancellationToken ct)
    {
        if (!currentUserProvider.IsSiteAdmin)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "רק מנהל-על יכול להפעיל ניסיון חוזר ידני" });
        }

        return Ok(await failedIncidentService.RetryNowAsync(id, ct));
    }
}
