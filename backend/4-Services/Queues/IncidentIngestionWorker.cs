using MyBackendApi.Services.Interfaces;

namespace MyBackendApi.Services.Queues;

public class IncidentIngestionWorker(
    IncidentChannelQueue queue,
    IServiceScopeFactory scopeFactory,
    ILogger<IncidentIngestionWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await foreach (var dto in queue.ReadAllAsync(stoppingToken))
        {
            try
            {
                using var scope = scopeFactory.CreateScope();
                var incidentService = scope.ServiceProvider.GetRequiredService<IIncidentService>();
                await incidentService.IngestIncidentAsync(dto, stoppingToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                logger.LogError(ex, "כשל בעיבוד אירוע מהתור עבור ErrorCode {ErrorCode}", dto.ErrorCode);
            }
        }
    }
}
