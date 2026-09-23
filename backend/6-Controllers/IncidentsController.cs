using Microsoft.AspNetCore.Mvc;
using MyBackendApi.Models.DTOs.Ingestion;
using MyBackendApi.Models.DTOs.Responses;
using MyBackendApi.Services.Interfaces;
using MyBackendApi.Services.Queues;

namespace MyBackendApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class IncidentsController(
    IIncidentService incidentService,
    IncidentChannelQueue queue,
    IRcaAgentService rcaAgentService) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<IncidentResponseDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<IncidentResponseDto>>> GetIncidents(
        [FromQuery] bool? unresolvedOnly,
        [FromQuery] string? subsystem,
        CancellationToken ct)
    {
        var incidents = await incidentService.GetAllIncidentsAsync(unresolvedOnly, subsystem, ct);
        return Ok(incidents);
    }

    [HttpGet("{id:long}")]
    [ProducesResponseType(typeof(IncidentResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<IncidentResponseDto>> GetIncidentById(
        [FromRoute] long id,
        CancellationToken ct)
    {
        var incident = await incidentService.GetIncidentByIdAsync(id, ct);
        return Ok(incident);
    }

    /// <summary>
    /// שער כניסה אסינכרוני (Fast Ingestion Gate) - קולט אירוע, דוחף לתור ומחזיר 202
    /// </summary>
    [HttpPost("ingest")]
    [ProducesResponseType(StatusCodes.Status202Accepted)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> IngestIncident(
        [FromBody] CreateIncidentDto dto,
        CancellationToken ct)
    {
        // כתיבה לערוץ זיכרון מהיר ללא חסימת ה-HTTP Pipeline
        await queue.QueueIncidentAsync(dto, ct);
        return Accepted(new { message = "Incident queued for processing and automated RCA." });
    }

    [HttpPatch("{id:long}/resolve")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ResolveIncident(
        [FromRoute] long id,
        CancellationToken ct)
    {
        await incidentService.MarkAsResolvedAsync(id, ct);
        return NoContent();
    }

    [HttpPost("{id:long}/diagnose-agent")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> DiagnoseWithAgent(
        [FromRoute] long id,
        CancellationToken ct)
    {
        var incident = await incidentService.GetIncidentByIdAsync(id, ct);

        var report = await rcaAgentService.AnalyzeAndRemediateIncidentAsync(
            incident!.ErrorCode,
            incident.ErrorMessage,
            incident.CaseNumber,
            incident.ResolutionPlaybook,
            ct);

        return Ok(new
        {
            incidentId = incident.IncidentId,
            errorCode = incident.ErrorCode,
            caseNumber = incident.CaseNumber,
            agentReport = report,
            analyzedAt = DateTimeOffset.UtcNow
        });
    }
}