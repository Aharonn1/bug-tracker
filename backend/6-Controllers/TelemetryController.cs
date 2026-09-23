using Microsoft.AspNetCore.Mvc;
using MyBackendApi.Models.DTOs.Ingestion;
using MyBackendApi.Models.DTOs.Telemetry;
using MyBackendApi.Services.Core;
using MyBackendApi.Services.Queues;

namespace MyBackendApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TelemetryController(
    TelemetryAnalysisService analysisService,
    IncidentChannelQueue queue,
    OpsInsightsService opsInsightsService) : ControllerBase
{
    [HttpPost("probe")]
    [ProducesResponseType(typeof(TelemetryDiagnosticReport), StatusCodes.Status200OK)]
    public async Task<OkObjectResult> ProcessProbe(
        [FromBody] ClientTelemetryProbeDto dto,
        CancellationToken ct)
    {
        var report = analysisService.AnalyzeClientMetrics(dto);

        if (report.StatusColor == "Red")
        {
            await queue.QueueIncidentAsync(new CreateIncidentDto(
                TenantId: dto.TenantId,
                ErrorCode: "CLIENT_NETWORK_DEGRADED",
                CaseNumber: null,
                ExternalReferenceId: null,
                ClientStationId: dto.StationId,
                UserId: null,
                ErrorMessage: $"Client network latency spike: {dto.LatencyMs}ms ({dto.EffectiveConnectionType})",
                StackTrace: null,
                RawPayload: null,
                ErrorFingerprintHash: null
            ), ct);
        }

        return Ok(report);
    }

    [HttpGet("ops-summary")]
    [ProducesResponseType(typeof(OpsSummaryDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> GetOpsSummary(
        [FromQuery] int minutes,
        CancellationToken ct)
    {
        var window = TimeSpan.FromMinutes(minutes <= 0 ? 60 : minutes);
        var summary = await opsInsightsService.GetSummaryAsync(window, ct);

        return summary is not null ? Ok(summary) : NoContent();
    }
}