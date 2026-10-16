using Microsoft.EntityFrameworkCore;
using MyBackendApi.Data;
using MyBackendApi.Models.Common;
using MyBackendApi.Models.Entities;
using MyBackendApi.Services.Interfaces;
using SendGrid;
using SendGrid.Helpers.Mail;

namespace MyBackendApi.Services.Notifications;

public class IncidentNotificationService(
    AppDbContext context,
    IConfiguration configuration,
    ILogger<IncidentNotificationService> logger) : IIncidentNotificationService
{
    public async Task NotifyNewIncidentAsync(SystemErrorIncident incident, CancellationToken ct = default)
    {
        var apiKey = configuration["SendGrid:ApiKey"];
        var fromEmail = configuration["SendGrid:FromEmail"];

        if (string.IsNullOrWhiteSpace(apiKey) || string.IsNullOrWhiteSpace(fromEmail))
        {
            logger.LogWarning("SendGrid לא מוגדר (SendGrid:ApiKey/FromEmail) - מדלג על התראה עבור תקרית {IncidentId}", incident.IncidentId);
            return;
        }

        // מנהל-משרד (Admin) של אותו לקוח + כל ה-SiteAdmin-ים חוצי-הלקוחות.
        // IgnoreQueryFilters הכרחי כאן - תמיד רץ מתוך ה-Background Worker (בלי
        // HttpContext), אז הסינון הרגיל של CurrentTenantId היה נופל
        var recipients = await context.Users
            .IgnoreQueryFilters()
            .Where(u => u.IsActive &&
                ((u.Role == UserRole.Admin && u.TenantId == incident.TenantId) ||
                 u.Role == UserRole.SiteAdmin))
            .Select(u => new { u.Email, u.FullName })
            .ToListAsync(ct);

        if (recipients.Count == 0)
        {
            logger.LogWarning("אין נמענים (Admin/SiteAdmin) לתקרית חדשה {IncidentId} בלקוח {TenantId}", incident.IncidentId, incident.TenantId);
            return;
        }

        var catalog = await context.ErrorCatalogs
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.ErrorCode == incident.ErrorCode, ct);

        var subject = $"[תקרית חדשה] {incident.ErrorCode} - {incident.TenantId}";
        var body =
            $"""
            תקרית חדשה התגלתה במערכת (לא הישנות של תקרית קיימת):

            לקוח/משרד: {incident.TenantId}
            קוד שגיאה: {incident.ErrorCode}
            חומרה: {catalog?.SeverityLevel.ToString() ?? "Medium"}
            הודעה: {incident.ErrorMessage}
            מספר תיק: {incident.CaseNumber ?? "ללא"}
            זמן התרחשות: {incident.CreatedAt:yyyy-MM-dd HH:mm:ss} UTC
            מזהה תקרית: {incident.IncidentId}

            הודעה אוטומטית ממערכת ניטור התקלות.
            """;

        // כשל שליחת אימייל לעולם לא אמור להפיל את קליטת התקרית עצמה - אותה
        // פילוסופיית חוסן כמו RcaAgentService מול Azure OpenAI
        try
        {
            var client = new SendGridClient(apiKey);
            var from = new EmailAddress(fromEmail, "BugReports - התראות תקריות");
            var tos = recipients.Select(r => new EmailAddress(r.Email, r.FullName)).ToList();
            var msg = MailHelper.CreateSingleEmailToMultipleRecipients(from, tos, subject, body, null);

            var response = await client.SendEmailAsync(msg, ct);

            if ((int)response.StatusCode >= 400)
            {
                var errBody = await response.Body.ReadAsStringAsync(ct);
                logger.LogError("SendGrid החזיר שגיאה ({StatusCode}) בשליחת התראה לתקרית {IncidentId}: {Body}",
                    response.StatusCode, incident.IncidentId, errBody);
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "כשל בשליחת התראת אימייל (SendGrid) לתקרית חדשה {IncidentId}", incident.IncidentId);
        }
    }
}
