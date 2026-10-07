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
    // בלי Take כאן, לקוח עם היסטוריית תקריות גדולה (למשל אחרי שנים של שימוש,
    // או סתם הרבה דיווחים אוטומטיים) היה מחזיר payload לא חסום לגמרי בכל טעינת
    // עמוד. זו לא החלפה אמיתית ל-pagination עם ניווט בין עמודים (שדורש גם שינוי
    // בפרונט), אלא רשת ביטחון שמונעת את התרחיש הגרוע ביותר
    private const int MaxResults = 500;

    public async Task<IEnumerable<IncidentResponseDto>> GetAllIncidentsAsync(
        bool? unresolvedOnly = null,
        string? subsystem = null,
        int? restrictToUserId = null,
        CancellationToken ct = default)
    {
        var query = context.SystemErrorIncidents
            .AsNoTracking()
            .Include(i => i.Details)
            .Include(i => i.Reporters).ThenInclude(r => r.User)
            .AsQueryable();

        if (unresolvedOnly == true)
        {
            query = query.Where(i => !i.IsResolved);
        }

        // כל משתמש רואה רק תקריות שהוא עצמו נתקל בהן; restrictToUserId מגיע
        // null רק כשהמזמין הוא Admin (נקבע ב-Controller)
        if (restrictToUserId.HasValue)
        {
            query = query.Where(i => i.Reporters.Any(r => r.UserId == restrictToUserId.Value));
        }

        var incidents = await query
            .OrderByDescending(i => i.CreatedAt)
            .Take(MaxResults)
            .ToListAsync(ct);

        // Join "רך" מול הקטלוג (לא FK אמיתי) - כי תקרית עם קוד שגיאה שעוד לא
        // תועד בקטלוג עדיין חייבת להישמר ולהיות גלויה כאן. נעשה בזיכרון כי אין
        // הרבה שורות בקטלוג, ומאפשר לשלב עם ה-Include של Reporters למעלה
        var catalogs = await context.ErrorCatalogs.AsNoTracking().ToDictionaryAsync(c => c.ErrorCode, ct);

        IEnumerable<SystemErrorIncident> filtered = incidents;
        if (!string.IsNullOrWhiteSpace(subsystem))
        {
            filtered = filtered.Where(i => catalogs.TryGetValue(i.ErrorCode, out var cat) && cat.Subsystem == subsystem);
        }

        return filtered.Select(i => MapToResponseDto(i, catalogs.GetValueOrDefault(i.ErrorCode)));
    }

    public async Task<IncidentResponseDto?> GetIncidentByIdAsync(long id, int? restrictToUserId = null, CancellationToken ct = default)
    {
        var incident = await context.SystemErrorIncidents
            .AsNoTracking()
            .Include(i => i.Details)
            .Include(i => i.Reporters).ThenInclude(r => r.User)
            .FirstOrDefaultAsync(i => i.IncidentId == id, ct);

        if (incident is null || (restrictToUserId.HasValue && incident.Reporters.All(r => r.UserId != restrictToUserId.Value)))
        {
            throw new IncidentNotFoundException(id);
        }

        var catalog = await context.ErrorCatalogs
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.ErrorCode == incident.ErrorCode, ct);

        return MapToResponseDto(incident, catalog);
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
            .Include(i => i.Reporters)
            .FirstOrDefaultAsync(i => i.TenantId == dto.TenantId && i.ErrorFingerprintHash == fingerprint, ct);

        long incidentId;

        if (existing is not null)
        {
            existing.OccurrencesCount++;
            existing.LastSeenAt = DateTime.UtcNow;

            // מוסיפים/מעדכנים את המשתמש הזה ברשימת המדווחים - כל משתמש חדש
            // שנתקל בתקרית נשמר, ולא רק "האחרון" (רבים-לרבים, לא דריסה)
            if (dto.ReportedByUserId.HasValue)
            {
                var reporter = existing.Reporters.FirstOrDefault(r => r.UserId == dto.ReportedByUserId.Value);
                if (reporter is not null)
                {
                    reporter.OccurrenceCount++;
                    reporter.LastSeenAt = DateTime.UtcNow;
                }
                else
                {
                    existing.Reporters.Add(new IncidentReporter { UserId = dto.ReportedByUserId.Value });
                }
            }

            await context.SaveChangesAsync(ct);
            incidentId = existing.IncidentId;
        }
        else
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
                ErrorFingerprintHash = fingerprint,
                Status = IncidentStatus.New,
                Details = new IncidentDetailPayload
                {
                    StackTrace = dto.StackTrace,
                    RawPayload = dto.RawPayload
                }
            };

            if (dto.ReportedByUserId.HasValue)
            {
                incident.Reporters.Add(new IncidentReporter { UserId = dto.ReportedByUserId.Value });
            }

            context.SystemErrorIncidents.Add(incident);
            await context.SaveChangesAsync(ct);
            incidentId = incident.IncidentId;
        }

        // טוענים מחדש עם ה-Include-ים הדרושים לתשובה, כדי לא להסתמך על fix-up
        // של navigation properties אחרי SaveChanges על ישויות שלא נטענו מראש.
        // IgnoreQueryFilters מאותה סיבה כמו למעלה - עדיין בתוך ה-Background Worker
        var saved = await context.SystemErrorIncidents
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Include(i => i.Details)
            .Include(i => i.Reporters).ThenInclude(r => r.User)
            .FirstAsync(i => i.IncidentId == incidentId, ct);

        var catalog = await context.ErrorCatalogs
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.ErrorCode == saved.ErrorCode, ct);

        return MapToResponseDto(saved, catalog);
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
            i.OccurrencesCount,
            i.CreatedAt,
            i.LastSeenAt,
            i.ResolvedAt,
            i.Details?.RawPayload,
            i.Reporters
                .OrderByDescending(r => r.LastSeenAt)
                .Select(r => new IncidentReporterDto(r.UserId, r.User.FullName, r.OccurrenceCount, r.LastSeenAt))
                .ToList()
        );
}
