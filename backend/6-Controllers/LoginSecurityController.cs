using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MyBackendApi.Models.DTOs.Responses;
using MyBackendApi.Services.Auth;
using MyBackendApi.Services.Interfaces;

namespace MyBackendApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class LoginSecurityController(
    ILoginSecurityService loginSecurityService,
    ICurrentUserProvider currentUserProvider) : ControllerBase
{
    private const string ForbiddenMessage = "רק מנהל-על יכול לגשת לאבטחת ההתחברות";

    [HttpGet("attempts")]
    [ProducesResponseType(typeof(IReadOnlyList<LoginAttemptSummaryDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> GetRecentAttempts(CancellationToken ct)
    {
        if (!currentUserProvider.IsSiteAdmin)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = ForbiddenMessage });
        }

        return Ok(await loginSecurityService.GetRecentAttemptsAsync(ct: ct));
    }

    [HttpGet("blocked-ips")]
    [ProducesResponseType(typeof(IReadOnlyList<BlockedIpSummaryDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> GetBlockedIps(CancellationToken ct)
    {
        if (!currentUserProvider.IsSiteAdmin)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = ForbiddenMessage });
        }

        return Ok(await loginSecurityService.GetBlockedIpsAsync(ct));
    }

    [HttpPost("blocked-ips/{ip}/unblock")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> Unblock([FromRoute] string ip, CancellationToken ct)
    {
        if (!currentUserProvider.IsSiteAdmin)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = ForbiddenMessage });
        }

        await loginSecurityService.UnblockAsync(ip, ct);
        return NoContent();
    }

    public record BlockIpRequest(int DurationHours = 24);

    [HttpPost("blocked-ips/{ip}/block")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> Block([FromRoute] string ip, [FromBody] BlockIpRequest request, CancellationToken ct)
    {
        if (!currentUserProvider.IsSiteAdmin)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = ForbiddenMessage });
        }

        await loginSecurityService.BlockManuallyAsync(ip, request.DurationHours, ct);
        return NoContent();
    }
}
