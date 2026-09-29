using MyBackendApi.Models.Common;
using MyBackendApi.Models.DTOs.Ingestion;
using MyBackendApi.Models.DTOs.Responses;

namespace MyBackendApi.Services.Interfaces;

public interface IBugService
{
    Task<IEnumerable<BugReportResponseDto>> GetAllBugsAsync(IncidentStatus? statusFilter = null, int? restrictToUserId = null, CancellationToken cancellationToken = default);
    Task<BugReportResponseDto> GetBugByIdAsync(int id, int? restrictToUserId = null, CancellationToken cancellationToken = default);
    Task<BugReportResponseDto> CreateBugAsync(CreateBugReportDto dto, CancellationToken cancellationToken = default);
    Task<BugReportResponseDto> UpdateBugStatusAsync(int id, IncidentStatus status, CancellationToken cancellationToken = default);
    Task<bool> DeleteBugAsync(int id, CancellationToken cancellationToken = default);
}