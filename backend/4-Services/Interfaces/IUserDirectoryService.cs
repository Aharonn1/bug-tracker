using MyBackendApi.Models.DTOs.Responses;

namespace MyBackendApi.Services.Interfaces;

public interface IUserDirectoryService
{
    Task<IReadOnlyList<UserSummaryDto>> GetAllUsersAsync(CancellationToken ct = default);
}
