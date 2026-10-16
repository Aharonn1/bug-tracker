using MyBackendApi.Models.DTOs.Responses;
using MyBackendApi.Models.Entities;

namespace MyBackendApi.Services.Interfaces;

public interface IFailedIncidentService
{
    Task<IReadOnlyList<FailedIncidentSummaryDto>> GetUnresolvedAsync(CancellationToken ct = default);

    Task<FailedIncidentRetryResultDto> RetryNowAsync(long id, CancellationToken ct = default);

    Task<bool> AttemptSingleRetryAsync(FailedIncidentIngestion entry, CancellationToken ct = default);
}
