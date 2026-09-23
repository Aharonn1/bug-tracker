using System.Threading.Channels;
using MyBackendApi.Models.DTOs.Ingestion;

namespace MyBackendApi.Services.Queues;

public class IncidentChannelQueue
{
    private readonly Channel<CreateIncidentDto> _channel = Channel.CreateBounded<CreateIncidentDto>(new BoundedChannelOptions(5000)
    {
        FullMode = BoundedChannelFullMode.Wait
    });

    public async ValueTask QueueIncidentAsync(CreateIncidentDto incident, CancellationToken ct = default)
    {
        await _channel.Writer.WriteAsync(incident, ct);
    }

    public IAsyncEnumerable<CreateIncidentDto> ReadAllAsync(CancellationToken ct = default)
    {
        return _channel.Reader.ReadAllAsync(ct);
    }
}