using MyBackendApi.Models.DTOs.Responses;

namespace MyBackendApi.Services.Interfaces;

public interface ILoginSecurityService
{
    Task<IReadOnlyList<LoginAttemptSummaryDto>> GetRecentAttemptsAsync(int take = 200, CancellationToken ct = default);

    Task<IReadOnlyList<BlockedIpSummaryDto>> GetBlockedIpsAsync(CancellationToken ct = default);

    Task UnblockAsync(string ip, CancellationToken ct = default);

    Task BlockManuallyAsync(string ip, int durationHours, CancellationToken ct = default);
}
