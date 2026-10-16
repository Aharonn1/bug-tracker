using MyBackendApi.Models.DTOs.Responses;

namespace MyBackendApi.Services.Interfaces;

public interface IUserDirectoryService
{
    Task<IReadOnlyList<UserSummaryDto>> GetAllUsersAsync(CancellationToken ct = default);

    Task MarkIncidentsViewedAsync(int userId, CancellationToken ct = default);

    Task<DateTime?> GetIncidentsLastViewedAtAsync(int userId, CancellationToken ct = default);
}
