using Microsoft.EntityFrameworkCore;
using MyBackendApi.Data;
using MyBackendApi.Models.DTOs.Telemetry;

namespace MyBackendApi.Services.Core;

// מרכז את הלוגיקה של הפקת מגמה חודשית מתוך AzureAlertOccurrences (לוג
// הוספה-בלבד, ראו הסבר שם) - נפרד מ-AzureAlertsController (שאחראי רק על
// קליטת ה-webhook) כדי שאפשר יהיה לקרוא לזה גם מ-TelemetryController בלי
// תלות הדדית בין שני ה-Controllers
public class AzureAlertOccurrenceService(AppDbContext db)
{
    public async Task<AzureHealthMonthlySummaryDto> GetMonthlySummaryAsync(int year, int month, CancellationToken ct)
    {
        var start = new DateTime(year, month, 1, 0, 0, 0, DateTimeKind.Utc);
        var end = start.AddMonths(1);

        var occurrences = await db.AzureAlertOccurrences
            .Where(o => o.FiredAt >= start && o.FiredAt < end)
            .Select(o => new { o.FiredAt, o.AlertType })
            .ToListAsync(ct);

        var dailyBreakdown = occurrences
            .GroupBy(o => o.FiredAt.Day)
            .Select(g => new DailyOccurrenceCountDto(g.Key, g.Count()))
            .OrderBy(d => d.Day)
            .ToList();

        var byAlertType = occurrences
            .GroupBy(o => o.AlertType)
            .Select(g => new AlertTypeCountDto(g.Key, g.Count()))
            .OrderByDescending(a => a.Count)
            .ToList();

        var earliest = await db.AzureAlertOccurrences
            .OrderBy(o => o.FiredAt)
            .Select(o => (DateTime?)o.FiredAt)
            .FirstOrDefaultAsync(ct);

        return new AzureHealthMonthlySummaryDto(
            Year: year,
            Month: month,
            TotalOccurrences: occurrences.Count,
            DailyBreakdown: dailyBreakdown,
            ByAlertType: byAlertType,
            EarliestTrackedOccurrence: earliest.HasValue ? new DateTimeOffset(earliest.Value, TimeSpan.Zero) : null
        );
    }
}
