using Microsoft.AspNetCore.Mvc;
using MyBackendApi.Models.DTOs.Ingestion;
using MyBackendApi.Models.DTOs.Telemetry;
using MyBackendApi.Services.Auth;
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
    AzureSqlMetricsService sqlMetricsService,
    AzureAppServiceMetricsService appServiceMetricsService,
    ICurrentTenantProvider tenantProvider,
    ICurrentUserProvider currentUserProvider) : ControllerBase
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
            // הבקשה - כאן היה אותו פער אמון שתוקן כבר בנתיב הקליטה הרגיל.
            //
            // ה-ErrorMessage הוא גם הקלט לחישוב ה-Fingerprint (ErrorDeduplicationService).
            // בעבר כלל את ה-latency המדויק (או אפילו מעוגל ל-500ms) - מספר ששונה
            // כמעט בכל בדיקה, ולכן כל בדיקה יצרה תקרית נפרדת במקום שדיווחים חוזרים
            // על אותה בעיה יצטברו לתקרית אחת. ה-station עדיין לא ממומש בפועל בפרונט
            // (תמיד null) כך שגם הוא לא עזר לבידול. ההודעה עכשיו קבועה וגנרית -
            // המספר המדויק עדיין נשמר, רק ב-RawPayload, שלא משפיע על ה-Fingerprint
            await queue.QueueIncidentAsync(new CreateIncidentDto(
                TenantId: tenantProvider.TenantId,
                ErrorCode: "CLIENT_NETWORK_DEGRADED",
                CaseNumber: null,
                ExternalReferenceId: null,
                ClientStationId: dto.StationId,
                UserId: null,
                ErrorMessage: "Client network latency degraded",
                StackTrace: null,
                RawPayload: $"Exact latency: {dto.LatencyMs}ms ({dto.EffectiveConnectionType}), station: {dto.StationId ?? "unknown"}",
                ReportedByUserId: currentUserProvider.UserId
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

    // מנהלים בלבד - מדדי Azure SQL נחשבים מידע תשתיתי פנימי, לא רלוונטי למשתמש רגיל
    [HttpGet("sql-health-metrics")]
    [ProducesResponseType(typeof(SqlHealthMetricsDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> GetSqlHealthMetrics(
        [FromQuery] int hours,
        CancellationToken ct)
    {
        if (!currentUserProvider.IsAdmin)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "רק מנהל מערכת יכול לגשת למדדי Azure" });
        }

        var window = TimeSpan.FromHours(hours <= 0 ? 24 : hours);
        var metrics = await sqlMetricsService.GetSqlHealthAsync(window, ct);

        return metrics is not null ? Ok(metrics) : NoContent();
    }

    // מנהלים בלבד - אותו שיקול כמו sql-health-metrics
    [HttpGet("app-service-health-metrics")]
    [ProducesResponseType(typeof(AppServiceHealthMetricsDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> GetAppServiceHealthMetrics(
        [FromQuery] int hours,
        CancellationToken ct)
    {
        if (!currentUserProvider.IsAdmin)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "רק מנהל מערכת יכול לגשת למדדי Azure" });
        }

        var window = TimeSpan.FromHours(hours <= 0 ? 24 : hours);
        var metrics = await appServiceMetricsService.GetAppServiceHealthAsync(window, ct);

        return metrics is not null ? Ok(metrics) : NoContent();
    }
}