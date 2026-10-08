using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MyBackendApi.Models.Common;
using MyBackendApi.Models.DTOs.Common;
using MyBackendApi.Models.DTOs.Ingestion;
using MyBackendApi.Models.DTOs.Responses;
using MyBackendApi.Services.Auth;
using MyBackendApi.Services.Interfaces;

namespace MyBackendApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class BugsController(IBugService bugService, ICurrentUserProvider currentUserProvider) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(PagedResultDto<BugReportResponseDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResultDto<BugReportResponseDto>>> GetAllBugs(
        [FromQuery] IncidentStatus? status,
        [FromQuery] int page,
        [FromQuery] int pageSize,
        CancellationToken cancellationToken)
    {
        // Admin רואה את כל הבאגים; משתמש רגיל רואה רק את אלו שהוא עצמו דיווח
        var restrictToUserId = currentUserProvider.IsAdmin ? null : currentUserProvider.UserId;
        var bugs = await bugService.GetAllBugsAsync(
            status, restrictToUserId,
            page <= 0 ? 1 : page, pageSize <= 0 ? 50 : pageSize, cancellationToken);
        return Ok(bugs);
    }

    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(BugReportResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<BugReportResponseDto>> GetBugById(
        [FromRoute] int id,
        CancellationToken cancellationToken)
    {
        var restrictToUserId = currentUserProvider.IsAdmin ? null : currentUserProvider.UserId;
        var bug = await bugService.GetBugByIdAsync(id, restrictToUserId, cancellationToken);
        return Ok(bug);
    }

    [HttpPost]
    [ProducesResponseType(typeof(BugReportResponseDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<BugReportResponseDto>> CreateBug(
        [FromBody] CreateBugReportDto dto,
        CancellationToken cancellationToken)
    {
        var createdBug = await bugService.CreateBugAsync(dto, cancellationToken);
        return CreatedAtAction(nameof(GetBugById), new { id = createdBug.Id }, createdBug);
    }

    [HttpPatch("{id:int}/status")]
    [ProducesResponseType(typeof(BugReportResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<BugReportResponseDto>> UpdateBugStatus(
        [FromRoute] int id,
        [FromBody] UpdateBugStatusDto dto,
        CancellationToken cancellationToken)
    {
        var restrictToUserId = currentUserProvider.IsAdmin ? null : currentUserProvider.UserId;
        var updated = await bugService.UpdateBugStatusAsync(id, dto.Status, restrictToUserId, cancellationToken);
        return Ok(updated);
    }

    [HttpDelete("{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteBug(
        [FromRoute] int id,
        CancellationToken cancellationToken)
    {
        var restrictToUserId = currentUserProvider.IsAdmin ? null : currentUserProvider.UserId;
        var deleted = await bugService.DeleteBugAsync(id, restrictToUserId, cancellationToken);
        if (!deleted)
        {
            return NotFound(new { message = $"Bug with ID {id} was not found." });
        }

        return NoContent();
    }
}