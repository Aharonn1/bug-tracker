using Microsoft.EntityFrameworkCore;
using MyBackendApi.Data;
using MyBackendApi.Services.Core;
using MyBackendApi.Services.Interfaces;

namespace MyBackendApi.Services.Queues;

// סוריקה תקופתית של FailedIncidentIngestions (Dead-Letter) - מנסה לפרוק
// מחדש תקריות שנכשלו בעיבוד הראשוני, עד תקרת MaxAttempts. אותה תבנית
// PeriodicTimer כמו DbOutageFlushWorker, אבל ה-bookkeeping עצמו חי ב-
// FailedIncidentService (משותף עם ה-endpoint הידני "נסה שוב")
public class FailedIncidentRetryWorker(
    IServiceScopeFactory scopeFactory,
    ILogger<FailedIncidentRetryWorker> logger) : BackgroundService
{
    private static readonly TimeSpan CheckInterval = TimeSpan.FromMinutes(2);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(CheckInterval);

        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            using var scope = scopeFactory.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var failedIncidentService = scope.ServiceProvider.GetRequiredService<IFailedIncidentService>();

            var pending = await context.FailedIncidentIngestions
                .Where(f => f.ResolvedAt == null && f.AttemptCount < FailedIncidentService.MaxAttempts)
                .OrderBy(f => f.FirstFailedAt)
                .Take(100) // תקרת batch-per-tick - לא עובד ללא הגבלה אם ה-DLQ מצטבר
                .ToListAsync(stoppingToken);

            if (pending.Count == 0) continue;

            var succeeded = 0;
            foreach (var entry in pending)
            {
                if (await failedIncidentService.AttemptSingleRetryAsync(entry, stoppingToken))
                {
                    succeeded++;
                }
            }

            if (succeeded > 0)
            {
                logger.LogInformation("{Count}/{Total} רשומות Dead-Letter נפרקו בהצלחה בסוויפ זה", succeeded, pending.Count);
            }
        }
    }
}
