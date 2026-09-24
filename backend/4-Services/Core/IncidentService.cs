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
        // Join "רך" מול הקטלוג (ולא Include על קשר FK אמיתי) - כי תקרית עם קוד
        // שגיאה שעוד לא תועד בקטלוג עדיין חייבת להישמר ולהיות גלויה כאן
        var query =
            from i in context.SystemErrorIncidents.AsNoTracking()
            join c in context.ErrorCatalogs.AsNoTracking() on i.ErrorCode equals c.ErrorCode into catalogJoin
            from catalog in catalogJoin.DefaultIfEmpty()
            select new { Incident = i, Catalog = catalog };

        if (unresolvedOnly == true)
        {
            query = query.Where(x => !x.Incident.IsResolved);
        }

        if (!string.IsNullOrWhiteSpace(subsystem))
        {
            query = query.Where(x => x.Catalog != null && x.Catalog.Subsystem == subsystem);
        }

        var rows = await query
            .OrderByDescending(x => x.Incident.CreatedAt)
            .ToListAsync(ct);

        return rows.Select(x => MapToResponseDto(x.Incident, x.Catalog));
    }

    public async Task<IncidentResponseDto?> GetIncidentByIdAsync(long id, CancellationToken ct = default)
    {
        var incident = await context.SystemErrorIncidents
            .AsNoTracking()
            .Include(i => i.Details)
            .FirstOrDefaultAsync(i => i.IncidentId == id, ct);

        if (incident is null) throw new IncidentNotFoundException(id);

        var catalog = await context.ErrorCatalogs
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.ErrorCode == incident.ErrorCode, ct);

        return MapToResponseDto(incident, catalog);
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

        // חיפוש רך בקטלוג במידה וקיים עבור התשובה - לא חוסם שמירה אם עדיין לא תועד
        var catalog = await context.ErrorCatalogs
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.ErrorCode == incident.ErrorCode, ct);

        return MapToResponseDto(incident, catalog);
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

    private static IncidentResponseDto MapToResponseDto(SystemErrorIncident i, ErrorCatalog? catalog) =>
        new(
            i.IncidentId,
            i.TenantId,
            i.ErrorCode,
            catalog?.Category ?? "General",
            catalog?.Subsystem ?? "Unknown",
            catalog?.SeverityLevel ?? IncidentSeverity.Medium,
            i.Status,
            catalog?.HebrewDescription ?? i.ErrorMessage,
            i.CaseNumber,
            i.ExternalReferenceId,
            i.ClientStationId,
            i.UserId,
            i.ErrorMessage,
            catalog?.ResolutionPlaybook,
            RecommendedAction: null,
            RootCauseSummary: null,
            i.IsResolved,
            i.CreatedAt,
            i.ResolvedAt
        );
}