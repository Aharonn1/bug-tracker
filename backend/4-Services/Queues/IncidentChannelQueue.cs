using System.Text.Json;
using System.Threading.Channels;
using MyBackendApi.Data;
using MyBackendApi.Models.DTOs.Ingestion;
using MyBackendApi.Models.Entities;

namespace MyBackendApi.Services.Queues;

// תלוי ב-IServiceScopeFactory/ILogger רק בשביל הנתיב החריג של כתיבה אחרי
// סגירה (ChannelClosedException) - סינגלטון שתלוי בשירותים scoped זה דבר
// תקני לגמרי כל עוד הוא פותח scope חדש לכל שימוש ולא שומר אותם
public class IncidentChannelQueue(IServiceScopeFactory scopeFactory, ILogger<IncidentChannelQueue> logger)
{
    private readonly Channel<CreateIncidentDto> _channel = Channel.CreateBounded<CreateIncidentDto>(new BoundedChannelOptions(5000)
    {
        FullMode = BoundedChannelFullMode.Wait
    });

    public async ValueTask QueueIncidentAsync(CreateIncidentDto incident, CancellationToken ct = default)
    {
        try
        {
            await _channel.Writer.WriteAsync(incident, ct);
        }
        catch (ChannelClosedException)
        {
            // קרה רק במירוץ נדיר: בקשה הגיעה אחרי שCompleteWriting() כבר
            // נקרא (כיבוי מתחיל). ה-Writer לא מקבל יותר כתיבות - בלי הטיפול
            // הזה התקרית הייתה הולכת לאיבוד בשקט. כותבים ישירות ל-Dead-Letter,
            // בדיוק כמו הרשת-הצלה הקיימת ב-IncidentIngestionWorker
            await WriteDirectlyToDeadLetterAsync(incident);
        }
    }

    public IAsyncEnumerable<CreateIncidentDto> ReadAllAsync(CancellationToken ct = default)
    {
        return _channel.Reader.ReadAllAsync(ct);
    }

    // נקרא מ-ApplicationStopping (Program.cs): מפסיק לקבל כתיבות חדשות,
    // אבל לא נוגע בפריטים שכבר בתור - ReadAllAsync ימשיך להחזיר אותם עד
    // שהתור יתרוקן, ורק אז יסתיים באופן טבעי. זה מה שמאפשר ל-Worker לנקז
    // את התור בכיבוי במקום לאבד כל מה שעדיין ממתין
    public void CompleteWriting()
    {
        _channel.Writer.TryComplete();
    }

    private async Task WriteDirectlyToDeadLetterAsync(CreateIncidentDto dto)
    {
        try
        {
            using var scope = scopeFactory.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            context.FailedIncidentIngestions.Add(new FailedIncidentIngestion
            {
                TenantId = dto.TenantId,
                DtoJson = JsonSerializer.Serialize(dto),
                ErrorMessage = "ChannelClosedException: הגיע לתור אחרי שהחל כיבוי האפליקציה",
            });
            // CancellationToken.None בכוונה - ראו הסבר זהה ב-TryWriteDeadLetterAsync
            await context.SaveChangesAsync(CancellationToken.None);
        }
        catch (Exception dlqEx)
        {
            logger.LogError(dlqEx, "כשל בכתיבת רשומת Dead-Letter עבור ErrorCode {ErrorCode} אחרי כיבוי התור - האירוע ילך לאיבוד", dto.ErrorCode);
        }
    }
}