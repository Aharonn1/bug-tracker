using MyBackendApi.Data;
using MyBackendApi.Models.DTOs.Ingestion;
using MyBackendApi.Services.Diagnostics;
using MyBackendApi.Services.Interfaces;

namespace MyBackendApi.Services.Queues;

// בודק תקופתית אם יש רשומות ב-DbOutageLog (יומן זיכרון-בלבד של תקלות "אין
// גישה ל-DB"), ומנסה "לפרוק" אותן כתקריות קבועות ברגע שה-DB אכן חזר להיות
// זמין - כדי שהתקלה הזמנית לא תישאר רק בזיכרון ותיעלם באתחול מחדש
public class DbOutageFlushWorker(
    DbOutageLog dbOutageLog,
    IServiceScopeFactory scopeFactory,
    ILogger<DbOutageFlushWorker> logger) : BackgroundService
{
    private static readonly TimeSpan CheckInterval = TimeSpan.FromSeconds(30);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(CheckInterval);

        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            if (!dbOutageLog.HasEntries) continue;

            using var scope = scopeFactory.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            bool canConnect;
            try
            {
                canConnect = await context.Database.CanConnectAsync(stoppingToken);
            }
            catch
            {
                canConnect = false;
            }

            // עדיין למטה - לא מרוקנים את היומן, מנסים שוב בטיק הבא
            if (!canConnect) continue;

            var incidentService = scope.ServiceProvider.GetRequiredService<IIncidentService>();
            var entries = dbOutageLog.DrainAll();
            var flushedCount = 0;

            foreach (var entry in entries)
            {
                try
                {
                    await incidentService.IngestIncidentAsync(new CreateIncidentDto(
                        TenantId: "default-tenant",
                        ErrorCode: "SERVER_DATABASE_UNAVAILABLE",
                        CaseNumber: null,
                        ExternalReferenceId: null,
                        ClientStationId: null,
                        UserId: null,
                        ErrorMessage: $"{entry.ExceptionType}: {entry.Message}",
                        StackTrace: null,
                        RawPayload: $"{entry.RequestPath} | נרשם ב-{entry.OccurredAt:o}",
                        ReportedByUserId: null
                    ), stoppingToken);

                    flushedCount++;
                }
                catch (Exception ex)
                {
                    // נכשל בכל זאת (למשל ה-DB נפל שוב באמצע) - מחזירים לתור
                    // כדי לא לאבד את הרשומה, ננסה שוב בטיק הבא
                    logger.LogError(ex, "כשל בפריקת רשומת DbOutageLog בודדת - מוחזרת לתור");
                    dbOutageLog.Record(entry);
                }
            }

            if (flushedCount > 0)
            {
                logger.LogInformation("נפרקו {Count} רשומות מ-DbOutageLog לאחר שה-DB חזר להיות זמין", flushedCount);
            }
        }
    }
}
