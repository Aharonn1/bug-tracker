using Microsoft.AspNetCore.Mvc;
using MyBackendApi.Models.DTOs.Ingestion;
using MyBackendApi.Models.DTOs.Telemetry;
using MyBackendApi.Services.Core;
using MyBackendApi.Services.Queues;
using MyBackendApi.Services.Tenancy;

namespace MyBackendApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TelemetryController(
    TelemetryAnalysisService analysisService,
    IncidentChannelQueue queue,
    OpsInsightsService opsInsightsService,
    ICurrentTenantProvider tenantProvider) : ControllerBase
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
            // TenantId נלקח מה-header המהימן (כמו ב-IncidentsController), לא מגוף
            // הבקשה - כאן היה אותו פער אמון שתוקן כבר בנתיב הקליטה הרגיל
            // ה-ErrorMessage מוצג למשתמש, אבל הוא גם הקלט לחישוב ה-Fingerprint של
            // מניעת הכפילויות (ErrorDeduplicationService) - latency מדויק (עם
            // עשרות ספרות אחרי הנקודה) שונה כמעט בכל בדיקה, ולכן כל בדיקה יצרה
            // תקרית נפרדת במקום שתקריות חוזרות מאותה עמדה יצטברו לתקרית אחת.
            // עיגול ל-500ms הקרוב שומר על חומרה משמעותית תוך כדי איפשור צבירה
            var latencyBucket = Math.Round(dto.LatencyMs / 500.0) * 500;

            await queue.QueueIncidentAsync(new CreateIncidentDto(
                TenantId: tenantProvider.TenantId,
                ErrorCode: "CLIENT_NETWORK_DEGRADED",
                CaseNumber: null,
                ExternalReferenceId: null,
                ClientStationId: dto.StationId,
                UserId: null,
                ErrorMessage: $"Client network latency spike: ~{latencyBucket:0}ms ({dto.EffectiveConnectionType}), station {dto.StationId ?? "unknown"}",
                StackTrace: null,
                RawPayload: $"Exact latency: {dto.LatencyMs}ms"
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