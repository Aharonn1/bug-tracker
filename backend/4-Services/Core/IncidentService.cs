using Microsoft.EntityFrameworkCore;
using MyBackendApi.Data;
using MyBackendApi.Exceptions;
using MyBackendApi.Models.Common;
using MyBackendApi.Models.DTOs.Ingestion;
using MyBackendApi.Models.DTOs.Responses;
using MyBackendApi.Models.Entities;
using MyBackendApi.Services.Interfaces;

namespace MyBackendApi.Services.Core;

public class IncidentService(AppDbContext context) : IIncidentService
{
    public async Task<IEnumerable<IncidentResponseDto>> GetAllIncidentsAsync(
        bool? unresolvedOnly = null, 
        string? subsystem = null, 
        CancellationToken ct = default)
    {
        var query = context.SystemErrorIncidents
            .AsNoTracking()
            .Include(i => i.ErrorCatalog)
            .AsQueryable();

        if (unresolvedOnly == true)
        {
            query = query.Where(i => !i.IsResolved);
        }

        if (!string.IsNullOrWhiteSpace(subsystem))
        {
            query = query.Where(i => i.ErrorCatalog != null && i.ErrorCatalog.Subsystem == subsystem);
        }

        var incidents = await query
            .OrderByDescending(i => i.CreatedAt)
            .ToListAsync(ct);

        return incidents.Select(MapToResponseDto);
    }

    public async Task<IncidentResponseDto?> GetIncidentByIdAsync(long id, CancellationToken ct = default)
    {
        var incident = await context.SystemErrorIncidents
            .AsNoTracking()
            .Include(i => i.ErrorCatalog)
            .Include(i => i.Details)
            .FirstOrDefaultAsync(i => i.IncidentId == id, ct);

        return incident is not null ? MapToResponseDto(incident) : throw new IncidentNotFoundException(id);
    }

    public async Task<IncidentResponseDto> IngestIncidentAsync(CreateIncidentDto dto, CancellationToken ct = default)
    {
        var incident = new SystemErrorIncident
        {
            // הערה: dto.TenantId כבר "הוחלף" ב-Controller בזמן שהיה HttpContext
            // זמין (לפני שנכנס לתור) בערך המהימן מה-header - כאן, בתוך ה-Background
            // Worker, אין HttpContext, ולכן לא ניתן להשתמש ב-context.CurrentTenantId
            TenantId = dto.TenantId,
            ErrorCode = dto.ErrorCode,
            ErrorMessage = dto.ErrorMessage,
            CaseNumber = dto.CaseNumber,
            ExternalReferenceId = dto.ExternalReferenceId,
            ClientStationId = dto.ClientStationId,
            UserId = dto.UserId,
            ErrorFingerprintHash = dto.ErrorFingerprintHash ?? string.Empty,
            Status = IncidentStatus.New,
            Details = new IncidentDetailPayload
            {
                StackTrace = dto.StackTrace,
                RawPayload = dto.RawPayload
            }
        };

        context.SystemErrorIncidents.Add(incident);
        await context.SaveChangesAsync(ct);

        // טעינת הקטלוג במידה וקיים עבור התשובה
        await context.Entry(incident).Reference(i => i.ErrorCatalog).LoadAsync(ct);

        return MapToResponseDto(incident);
    }

    public async Task MarkAsResolvedAsync(long id, CancellationToken ct = default)
    {
        // שאילתת Where מפורשת (ולא FindAsync) כדי להבטיח שה-Global Query Filter
        // של ה-Tenant מוחל - כך תקרית של לקוח אחר תיחשב "לא נמצאה" ולא ניתנת לעדכון
        var incident = await context.SystemErrorIncidents
            .FirstOrDefaultAsync(i => i.IncidentId == id, ct);
        if (incident is null) throw new IncidentNotFoundException(id);

        incident.IsResolved = true;
        incident.Status = IncidentStatus.Closed;
        incident.ResolvedAt = DateTime.UtcNow;

        await context.SaveChangesAsync(ct);
    }

    private static IncidentResponseDto MapToResponseDto(SystemErrorIncident i) =>
        new(
            i.IncidentId,
            i.TenantId,
            i.ErrorCode,
            i.ErrorCatalog?.Category ?? "General",
            i.ErrorCatalog?.Subsystem ?? "Unknown",
            i.ErrorCatalog?.SeverityLevel ?? IncidentSeverity.Medium,
            i.Status,
            i.ErrorCatalog?.HebrewDescription ?? i.ErrorMessage,
            i.CaseNumber,
            i.ExternalReferenceId,
            i.ClientStationId,
            i.UserId,
            i.ErrorMessage,
            i.ErrorCatalog?.ResolutionPlaybook,
            RecommendedAction: null,
            RootCauseSummary: null,
            i.IsResolved,
            i.CreatedAt,
            i.ResolvedAt
        );
}