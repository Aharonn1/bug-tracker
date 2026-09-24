using Microsoft.AspNetCore.Mvc;
using MyBackendApi.Models.Common;
using MyBackendApi.Models.DTOs.Ingestion;
using MyBackendApi.Models.DTOs.Responses;
using MyBackendApi.Services.Interfaces;

namespace MyBackendApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class BugsController(IBugService bugService) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<BugReportResponseDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<BugReportResponseDto>>> GetAllBugs(
        [FromQuery] IncidentStatus? status,
        CancellationToken cancellationToken)
    {
        var bugs = await bugService.GetAllBugsAsync(status, cancellationToken);
        return Ok(bugs);
    }

    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(BugReportResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<BugReportResponseDto>> GetBugById(
        [FromRoute] int id,
        CancellationToken cancellationToken)
    {
        var bug = await bugService.GetBugByIdAsync(id, cancellationToken);
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
        var updated = await bugService.UpdateBugStatusAsync(id, dto.Status, cancellationToken);
        return Ok(updated);
    }

    [HttpDelete("{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteBug(
        [FromRoute] int id,
        CancellationToken cancellationToken)
    {
        var deleted = await bugService.DeleteBugAsync(id, cancellationToken);
        if (!deleted)
        {
            return NotFound(new { message = $"Bug with ID {id} was not found." });
        }

        return NoContent();
    }
}