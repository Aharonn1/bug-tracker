using MyBackendApi.Models.DTOs.Ingestion;
using MyBackendApi.Models.DTOs.Responses;

namespace MyBackendApi.Services.Interfaces;

public interface IIncidentService
{
    Task<IEnumerable<IncidentResponseDto>> GetAllIncidentsAsync(
        bool? unresolvedOnly = null,
        string? subsystem = null,
        int? restrictToUserId = null,
        CancellationToken ct = default);

    Task<IncidentResponseDto?> GetIncidentByIdAsync(long id, int? restrictToUserId = null, CancellationToken ct = default);

    Task<IncidentResponseDto> IngestIncidentAsync(CreateIncidentDto dto, CancellationToken ct = default);

    Task MarkAsResolvedAsync(long id, CancellationToken ct = default);
}