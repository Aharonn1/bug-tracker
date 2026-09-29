using Microsoft.EntityFrameworkCore;
using MyBackendApi.Data;
using MyBackendApi.Exceptions;
using MyBackendApi.Models.Common;
using MyBackendApi.Models.DTOs.Ingestion;
using MyBackendApi.Models.DTOs.Responses;
using MyBackendApi.Models.Entities;
using MyBackendApi.Services.Deduplication;
using MyBackendApi.Services.Interfaces;

namespace MyBackendApi.Services.Core;

public class IncidentService(AppDbContext context, ErrorDeduplicationService deduplicationService) : IIncidentService
{
    public async Task<IEnumerable<IncidentResponseDto>> GetAllIncidentsAsync(
        bool? unresolvedOnly = null,
        string? subsystem = null,
        int? restrictToUserId = null,
        CancellationToken ct = default)
    {
        // Join "רך" מול הקטלוג (ולא Include על קשר FK אמיתי) - כי תקרית עם קוד
        // שגיאה שעוד לא תועד בקטלוג עדיין חייבת להישמר ולהיות גלויה כאן
        var query =
            from i in context.SystemErrorIncidents.AsNoTracking()
            join c in context.ErrorCatalogs.AsNoTracking() on i.ErrorCode equals c.ErrorCode into catalogJoin
            from catalog in catalogJoin.DefaultIfEmpty()
            join u in context.Users.AsNoTracking() on i.ReportedByUserId equals u.Id into userJoin
            from reporter in userJoin.DefaultIfEmpty()
            select new { Incident = i, Catalog = catalog, ReporterName = reporter.FullName };

        if (unresolvedOnly == true)
        {
            query = query.Where(x => !x.Incident.IsResolved);
        }

        if (!string.IsNullOrWhiteSpace(subsystem))
        {
            query = query.Where(x => x.Catalog != null && x.Catalog.Subsystem == subsystem);
        }

        // כל משתמש רואה רק את התקריות שנוצרו בפעילות שלו - restrictToUserId מגיע
        // null רק כשהמזמין הוא Admin (נקבע ב-Controller)
        if (restrictToUserId.HasValue)
        {
            query = query.Where(x => x.Incident.ReportedByUserId == restrictToUserId.Value);
        }

        var rows = await query
            .OrderByDescending(x => x.Incident.CreatedAt)
            .ToListAsync(ct);

        return rows.Select(x => MapToResponseDto(x.Incident, x.Catalog, x.ReporterName));
    }

    public async Task<IncidentResponseDto?> GetIncidentByIdAsync(long id, int? restrictToUserId = null, CancellationToken ct = default)
    {
        var incident = await context.SystemErrorIncidents
            .AsNoTracking()
            .Include(i => i.Details)
            .FirstOrDefaultAsync(i => i.IncidentId == id, ct);

        if (incident is null || (restrictToUserId.HasValue && incident.ReportedByUserId != restrictToUserId.Value))
        {
            throw new IncidentNotFoundException(id);
        }

        var catalog = await context.ErrorCatalogs
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.ErrorCode == incident.ErrorCode, ct);

        var reporterName = incident.ReportedByUserId.HasValue
            ? await context.Users.AsNoTracking()
                .Where(u => u.Id == incident.ReportedByUserId.Value)
                .Select(u => u.FullName)
                .FirstOrDefaultAsync(ct)
            : null;

        return MapToResponseDto(incident, catalog, reporterName);
    }

    public async Task<IncidentResponseDto> IngestIncidentAsync(CreateIncidentDto dto, CancellationToken ct = default)
    {
        // חתימת ה-Fingerprint מחושבת בשרת (לא נלקחת מהלקוח) - כך שני לקוחות שונים
        // שמדווחים אותה שגיאה בדיוק מקבלים תמיד את אותה חתימה
        var fingerprint = deduplicationService.GenerateFingerprint(dto.ErrorCode, dto.ErrorMessage, dto.StackTrace);

        // בדיקת כפילות לפי האינדקס המורכב (TenantId, ErrorFingerprintHash) - אם
        // התקרית כבר קיימת ללקוח הזה, סופרים הישנות נוספת במקום ליצור שורה כפולה.
        // IgnoreQueryFilters כי אנחנו בתוך ה-Background Worker (בלי HttpContext) -
        // הסינון הרגיל היה מנסה להעריך CurrentTenantId ונופל; מסננים ידנית לפי
        // dto.TenantId שכבר הוחלף בערך המהימן ב-Controller
        var existing = await context.SystemErrorIncidents
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(i => i.TenantId == dto.TenantId && i.ErrorFingerprintHash == fingerprint, ct);

        if (existing is not null)
        {
            existing.OccurrencesCount++;
            existing.LastSeenAt = DateTime.UtcNow;
            await context.SaveChangesAsync(ct);

            var existingCatalog = await context.ErrorCatalogs
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.ErrorCode == existing.ErrorCode, ct);

            var existingReporterName = existing.ReportedByUserId.HasValue
                ? await context.Users.AsNoTracking()
                    .Where(u => u.Id == existing.ReportedByUserId.Value)
                    .Select(u => u.FullName)
                    .FirstOrDefaultAsync(ct)
                : null;

            return MapToResponseDto(existing, existingCatalog, existingReporterName);
        }

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
            ReportedByUserId = dto.ReportedByUserId,
            ErrorFingerprintHash = fingerprint,
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

        var reporterName = incident.ReportedByUserId.HasValue
            ? await context.Users.AsNoTracking()
                .Where(u => u.Id == incident.ReportedByUserId.Value)
                .Select(u => u.FullName)
                .FirstOrDefaultAsync(ct)
            : null;

        return MapToResponseDto(incident, catalog, reporterName);
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

    private static IncidentResponseDto MapToResponseDto(SystemErrorIncident i, ErrorCatalog? catalog, string? reporterName = null) =>
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
            i.OccurrencesCount,
            i.CreatedAt,
            i.LastSeenAt,
            i.ResolvedAt,
            i.ReportedByUserId,
            reporterName
        );
}