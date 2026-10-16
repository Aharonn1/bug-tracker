using System.Text.Json;
using MyBackendApi.Data;
using MyBackendApi.Models.DTOs.Ingestion;
using MyBackendApi.Models.Entities;
using MyBackendApi.Services.Interfaces;

namespace MyBackendApi.Services.Queues;

public class IncidentIngestionWorker(
    IncidentChannelQueue queue,
    IServiceScopeFactory scopeFactory,
    IConfiguration configuration,
    ILogger<IncidentIngestionWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // היה consumer טורי יחיד - תקרית אחת מעובדת בכל פעם, לא משנה כמה
        // מגיעות בו-זמנית. בעומס אמיתי זה הופך לצוואר בקבוק, ובגלל שהתור חסום
        // (BoundedChannel עם FullMode.Wait), כש-5000 הפריטים ממתינים בתור, גם
        // שער הקליטה המהיר (202 Accepted) מתחיל *לחסום* בפועל - בדיוק ההפך
        // ממה שהוא נועד לעשות. כמה worker-ים קוראים מאותו Channel בו-זמנית -
        // Channel<T> תומך בכך טבעי, כל פריט מגיע לדיוק consumer אחד.
        //
        // עיבוד מקביל חושף מירוץ אמיתי בבדיקת הכפילות (check-then-act) ב-
        // IngestIncidentAsync - שם זה כבר מטופל (אינדקס ייחודי ב-DB + תפיסת
        // DbUpdateException וניסיון חוזר כ"עדכון"), אז בטוח להפעיל כאן יותר
        // מ-worker אחד
        var degreeOfParallelism = configuration.GetValue<int?>("IncidentIngestion:DegreeOfParallelism") ?? 4;

        var options = new ParallelOptions
        {
            MaxDegreeOfParallelism = degreeOfParallelism,
            CancellationToken = stoppingToken,
        };

        await Parallel.ForEachAsync(queue.ReadAllAsync(stoppingToken), options, async (dto, ct) =>
        {
            try
            {
                using var scope = scopeFactory.CreateScope();
                var incidentService = scope.ServiceProvider.GetRequiredService<IIncidentService>();
                await incidentService.IngestIncidentAsync(dto, ct);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                logger.LogError(ex, "כשל בעיבוד אירוע מהתור עבור ErrorCode {ErrorCode}", dto.ErrorCode);
                await TryWriteDeadLetterAsync(dto, ex);
            }
        });
    }

    // Dead-Letter: רשת-הצלה אחרונה כדי שתקרית שנכשלה לא תלך לאיבוד בשקט -
    // נשמרת לטבלה נפרדת ו-FailedIncidentRetryWorker ינסה שוב מאוחר יותר
    private async Task TryWriteDeadLetterAsync(CreateIncidentDto dto, Exception ex)
    {
        try
        {
            // Scope חדש ונקי - ה-scope שכשל למעלה כבר disposed (היה בתוך ה-try),
            // וגם אם לא היה, עדיף DbContext רענן ולא אחד שאולי במצב שגוי אחרי חריגה
            using var scope = scopeFactory.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            context.FailedIncidentIngestions.Add(new FailedIncidentIngestion
            {
                TenantId = dto.TenantId,
                DtoJson = JsonSerializer.Serialize(dto),
                ErrorMessage = $"{ex.GetType().Name}: {ex.Message}",
            });
            // CancellationToken.None בכוונה - זו בדיוק הרשומה שאמורה לתפוס
            // עבודה שאבדה; אם האפליקציה באמצע כיבוי, אסור שזה יגרום לנו
            // לפספס גם את רשת ההצלה האחרונה
            await context.SaveChangesAsync(CancellationToken.None);
        }
        catch (Exception dlqEx)
        {
            // כשל אחרון - גם כתיבת ה-Dead-Letter נכשלה, אין עוד רשת הצלה.
            // התקרית עבור ErrorCode הזה תלך לאיבוד לחלוטין, רק מתועד בלוג
            logger.LogError(dlqEx, "כשל בכתיבת רשומת Dead-Letter עבור ErrorCode {ErrorCode} - האירוע ילך לאיבוד", dto.ErrorCode);
        }
    }
}
