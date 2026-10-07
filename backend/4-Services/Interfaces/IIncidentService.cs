using MyBackendApi.Models.DTOs.Common;
using MyBackendApi.Models.DTOs.Ingestion;
using MyBackendApi.Models.DTOs.Responses;

namespace MyBackendApi.Services.Interfaces;

public interface IIncidentService
{
    Task<PagedResultDto<IncidentResponseDto>> GetAllIncidentsAsync(
        bool? unresolvedOnly = null,
        string? subsystem = null,
        int? restrictToUserId = null,
        int page = 1,
        int pageSize = 50,
        CancellationToken ct = default);

    Task<IncidentResponseDto?> GetIncidentByIdAsync(long id, int? restrictToUserId = null, CancellationToken ct = default);

    Task<IncidentResponseDto> IngestIncidentAsync(CreateIncidentDto dto, CancellationToken ct = default);

    Task MarkAsResolvedAsync(long id, CancellationToken ct = default);
}