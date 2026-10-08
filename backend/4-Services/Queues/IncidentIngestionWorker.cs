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
            }
        });
    }
}
