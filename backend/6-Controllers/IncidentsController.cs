using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using MyBackendApi.Models.DTOs.Ingestion;
using MyBackendApi.Models.DTOs.Responses;
using MyBackendApi.Services.Auth;
using MyBackendApi.Services.Diagnostics;
using MyBackendApi.Services.Interfaces;
using MyBackendApi.Services.Queues;
using MyBackendApi.Services.Tenancy;

namespace MyBackendApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class IncidentsController(
    IIncidentService incidentService,
    IncidentChannelQueue queue,
    IRcaAgentService rcaAgentService,
    ICurrentTenantProvider tenantProvider,
    ICurrentUserProvider currentUserProvider,
    DbOutageLog dbOutageLog) : ControllerBase
{
    /// <summary>
    /// יומן זיכרון-בלבד של תקלות "אין גישה ל-DB" - לא נוגע ב-EF Core/SQL בכלל,
    /// כדי שיישאר זמין גם כשבסיס הנתונים עצמו למטה. אימות ה-JWT לא דורש DB
    /// (חתימה קריפטוגרפית בלבד), אז זה עובד כל עוד יש למשתמש טוקן תקף מלפני התקלה
    /// </summary>
    [HttpGet("db-outage-log")]
    [ProducesResponseType(typeof(IEnumerable<DbOutageEntry>), StatusCodes.Status200OK)]
    public IActionResult GetDbOutageLog()
    {
        return Ok(dbOutageLog.Snapshot());
    }

    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<IncidentResponseDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<IncidentResponseDto>>> GetIncidents(
        [FromQuery] bool? unresolvedOnly,
        [FromQuery] string? subsystem,
        CancellationToken ct)
    {
        // Admin רואה את כל התקריות; משתמש רגיל רואה רק את אלו שקשורות לפעילות שלו
        var restrictToUserId = currentUserProvider.IsAdmin ? null : currentUserProvider.UserId;
        var incidents = await incidentService.GetAllIncidentsAsync(unresolvedOnly, subsystem, restrictToUserId, ct);
        return Ok(incidents);
    }

    [HttpGet("{id:long}")]
    [ProducesResponseType(typeof(IncidentResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<IncidentResponseDto>> GetIncidentById(
        [FromRoute] long id,
        CancellationToken ct)
    {
        var restrictToUserId = currentUserProvider.IsAdmin ? null : currentUserProvider.UserId;
        var incident = await incidentService.GetIncidentByIdAsync(id, restrictToUserId, ct);
        return Ok(incident);
    }

    /// <summary>
    /// שער כניסה אסינכרוני (Fast Ingestion Gate) - קולט אירוע, דוחף לתור ומחזיר 202.
    /// AllowAnonymous בכוונה, על אף ש-[Authorize] חל על שאר הבקר: בדיוק תקלות
    /// חיבור/קריסה שקורות למי שעוד לא (או כבר לא) מחובר - למשל כשל בזמן ניסיון
    /// login עצמו - חייבות להצליח להתדווח, אחרת הן היו נעולות לנצח בתור המקומי
    /// (retry queue) של הלקוח בלי אפשרות אמיתית להגיע אלינו. ReportedByUserId
    /// פשוט נשאר null במקרה כזה - "לא מזוהה" בממשק, לא שגיאת דיווח
    /// </summary>
    [HttpPost("ingest")]
    [AllowAnonymous]
    [EnableRateLimiting("ingest")]
    [ProducesResponseType(StatusCodes.Status202Accepted)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> IngestIncident(
        [FromBody] CreateIncidentDto dto,
        CancellationToken ct)
    {
        // מחליפים כאן (בזמן שיש עדיין HttpContext) את ה-TenantId שהלקוח שלח בגוף
        // הבקשה בזה שמזוהה מה-header המהימן - כך שה-Worker שמעבד את התור מאוחר
        // יותר (בלי HttpContext משלו) יקבל כבר ערך מהימן ולא צריך "לנחש" מי הלקוח.
        // אותו הדבר לגבי ReportedByUserId - נלקח מה-JWT כאן ולא מגוף הבקשה
        var trustedDto = dto with { TenantId = tenantProvider.TenantId, ReportedByUserId = currentUserProvider.UserId };

        // כתיבה לערוץ זיכרון מהיר ללא חסימת ה-HTTP Pipeline
        await queue.QueueIncidentAsync(trustedDto, ct);
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
        var restrictToUserId = currentUserProvider.IsAdmin ? null : currentUserProvider.UserId;
        var incident = await incidentService.GetIncidentByIdAsync(id, restrictToUserId, ct);

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