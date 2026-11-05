using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using MyBackendApi.Models.DTOs.Ingestion;
using MyBackendApi.Services.Queues;
using Xunit;

namespace MyBackendApi.Tests;

public class IncidentChannelQueueTests
{
    private static IncidentChannelQueue CreateQueue()
    {
        var scopeFactory = new ServiceCollection().BuildServiceProvider();
        return new IncidentChannelQueue(
            scopeFactory.GetRequiredService<IServiceScopeFactory>(),
            NullLogger<IncidentChannelQueue>.Instance);
    }

    private static CreateIncidentDto MakeDto(string errorCode) => new(
        TenantId: "default-tenant",
        ErrorCode: errorCode,
        CaseNumber: null,
        ExternalReferenceId: null,
        ClientStationId: null,
        UserId: null,
        ErrorMessage: "test",
        StackTrace: null,
        RawPayload: null
    );

    [Fact]
    public async Task CompleteWriting_DrainsItemsQueuedBeforehand_ThenReadAllAsyncEndsNaturally()
    {
        var queue = CreateQueue();
        await queue.QueueIncidentAsync(MakeDto("A"));
        await queue.QueueIncidentAsync(MakeDto("B"));

        // מדמה את מה שקורה בכיבוי: אין כתיבות חדשות, אבל מה שכבר בתור
        // חייב להמשיך להיקרא
        queue.CompleteWriting();

        var drained = new List<string>();
        await foreach (var dto in queue.ReadAllAsync())
        {
            drained.Add(dto.ErrorCode);
        }

        Assert.Equal(["A", "B"], drained);
    }

    [Fact]
    public async Task QueueIncidentAsync_AfterCompleteWriting_DoesNotThrow()
    {
        var queue = CreateQueue();
        queue.CompleteWriting();

        // אחרי סגירת הכתיבה, הכתיבה החדשה לא אמורה לזרוק ChannelClosedException
        // כלפי מעלה - היא נופלת לנתיב ה-Dead-Letter ונבלעת בשקט (מתועד בלוג)
        await queue.QueueIncidentAsync(MakeDto("LATE"));
    }
}
