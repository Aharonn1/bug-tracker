using MyBackendApi.Models.Entities;

namespace MyBackendApi.Services.Interfaces;

public interface IIncidentNotificationService
{
    Task NotifyNewIncidentAsync(SystemErrorIncident incident, CancellationToken ct = default);
}
