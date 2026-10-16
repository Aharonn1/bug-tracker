using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using MyBackendApi.Data;
using MyBackendApi.Exceptions;
using MyBackendApi.Models.DTOs.Ingestion;
using MyBackendApi.Models.DTOs.Responses;
using MyBackendApi.Models.Entities;
using MyBackendApi.Services.Interfaces;

namespace MyBackendApi.Services.Core;

public class FailedIncidentService(
    AppDbContext context,
    IIncidentService incidentService,
    ILogger<FailedIncidentService> logger) : IFailedIncidentService
{
    // תואם ל-MaxConcurrencyRetries הקיים ב-IncidentService כתקדים - אחרי
    // זה נשאר גלוי לבדיקה ידנית במקום לנסות שוב לנצח
    public const int MaxAttempts = 5;

    public async Task<IReadOnlyList<FailedIncidentSummaryDto>> GetUnresolvedAsync(CancellationToken ct = default)
    {
        var rows = await context.FailedIncidentIngestions
            .AsNoTracking()
            .Where(f => f.ResolvedAt == null)
            .OrderBy(f => f.FirstFailedAt)
            .ToListAsync(ct);

        return rows.Select(f => new FailedIncidentSummaryDto(
            f.Id, f.TenantId, ExtractErrorCode(f.DtoJson), f.ErrorMessage,
            f.FirstFailedAt, f.LastAttemptAt, f.AttemptCount)).ToList();
    }

    // תג המספר ליד "תקריות שנכשלו" בניווט - נספר בנפרד מ-GetUnresolvedAsync
    // כדי שלא נצטרך לגרור/לפענח כל DtoJson רק בשביל מספר
    public async Task<int> GetUnresolvedCountAsync(CancellationToken ct = default)
    {
        return await context.FailedIncidentIngestions.CountAsync(f => f.ResolvedAt == null, ct);
    }

    public async Task<FailedIncidentRetryResultDto> RetryNowAsync(long id, CancellationToken ct = default)
    {
        var entry = await context.FailedIncidentIngestions.FirstOrDefaultAsync(f => f.Id == id, ct)
            ?? throw new FailedIncidentNotFoundException(id);

        if (entry.ResolvedAt is not null)
        {
            return new FailedIncidentRetryResultDto(true, null);
        }

        var succeeded = await AttemptSingleRetryAsync(entry, ct);
        return new FailedIncidentRetryResultDto(succeeded, succeeded ? null : entry.ErrorMessage);
    }

    // נקודת-אמת יחידה ל"ניסיון חוזר בודד" - גם ה-Worker התקופתי וגם ה-endpoint
    // הידני קוראים לכאן, כדי שה-bookkeeping (מונה ניסיונות, תאריך פתרון,
    // הודעת שגיאה) לא יתבדר ביניהם
    public async Task<bool> AttemptSingleRetryAsync(FailedIncidentIngestion entry, CancellationToken ct = default)
    {
        try
        {
            var dto = JsonSerializer.Deserialize<CreateIncidentDto>(entry.DtoJson)
                ?? throw new InvalidOperationException("DtoJson נפתר ל-null");
            await incidentService.IngestIncidentAsync(dto, ct);

            // IngestIncidentAsync יכול לקרוא ל-ChangeTracker.Clear() על אותו
            // context משותף (למשל בנפילה חזרה אחרי מירוץ DbUpdateException) -
            // מה שמנתק את entry מהמעקב בלי לזרוק חריגה. בלי ה-Attach הזה,
            // העדכונים למטה היו "נבלעים" בשקט ב-SaveChanges הבא
            ReattachIfDetached(entry);
            entry.ResolvedAt = DateTime.UtcNow;
            entry.LastAttemptAt = DateTime.UtcNow;
            await context.SaveChangesAsync(ct);
            return true;
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            ReattachIfDetached(entry);
            entry.AttemptCount++;
            entry.LastAttemptAt = DateTime.UtcNow;
            entry.ErrorMessage = $"{ex.GetType().Name}: {ex.Message}";
            logger.LogWarning(ex, "ניסיון חוזר נכשל עבור Dead-Letter #{Id} ({Attempt}/{Max})", entry.Id, entry.AttemptCount, MaxAttempts);
            // CancellationToken.None - גם אם ה-ct שבוטל (למשל טיימאאוט בקשה),
            // עדיין רוצים לשמור את עדכון מונה-הניסיונות כדי לא "לאבד" ניסיון
            await context.SaveChangesAsync(CancellationToken.None);
            return false;
        }
    }

    private void ReattachIfDetached(FailedIncidentIngestion entry)
    {
        if (context.Entry(entry).State == EntityState.Detached)
        {
            context.Attach(entry);
        }
    }

    private static string ExtractErrorCode(string dtoJson)
    {
        try
        {
            return JsonSerializer.Deserialize<CreateIncidentDto>(dtoJson)?.ErrorCode ?? "לא ידוע";
        }
        catch
        {
            return "לא ידוע";
        }
    }
}
