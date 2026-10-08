using System.Collections.Concurrent;
using Microsoft.EntityFrameworkCore;
using MyBackendApi.Data;
using MyBackendApi.Exceptions;
using MyBackendApi.Models.Common;
using MyBackendApi.Models.DTOs.Common;
using MyBackendApi.Models.DTOs.Ingestion;
using MyBackendApi.Models.DTOs.Responses;
using MyBackendApi.Models.Entities;
using MyBackendApi.Services.Deduplication;
using MyBackendApi.Services.Interfaces;

namespace MyBackendApi.Services.Core;

public class IncidentService(AppDbContext context, ErrorDeduplicationService deduplicationService) : IIncidentService
{
    private const int MaxPageSize = 200;

    // נעילה בתוך-תהליך לכל (tenant, fingerprint) - זה מה שבאמת פותר את מירוץ
    // ה-dedup תחת עיבוד מקביל (ראו IncidentIngestionWorker): כמה worker-ים
    // יכולים לעבד בו-זמנית תקריות *שונות* לגמרי, אבל רק אחד בכל רגע נתון
    // יכול לעבד את *אותה* תקרית בדיוק. נבדק אמפירית מול retry-with-backoff
    // בלבד על ה-DB (RowVersion/DbUpdateConcurrencyException) - תחת עומס אמיתי
    // (25 בקשות זהות במקביל) זה עדיין איבד דיווחים ויצר כפילות; הנעילה הזו
    // מבטלת את המירוץ מהיסוד במקום לנסות "לנצח" אותו שוב ושוב.
    // ה-Dictionary גדל עם כל fingerprint חדש וממש לא מתנקה - מקובל כי מספר
    // סוגי השגיאות השונים בפועל קטן ויציב, לא יחסי לכמות הבקשות
    private static readonly ConcurrentDictionary<string, SemaphoreSlim> IncidentLocks = new();

    private static SemaphoreSlim GetIncidentLock(string tenantId, string fingerprint) =>
        IncidentLocks.GetOrAdd($"{tenantId}:{fingerprint}", static _ => new SemaphoreSlim(1, 1));

    public async Task<PagedResultDto<IncidentResponseDto>> GetAllIncidentsAsync(
        bool? unresolvedOnly = null,
        string? subsystem = null,
        int? restrictToUserId = null,
        int page = 1,
        int pageSize = 50,
        CancellationToken ct = default)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, MaxPageSize);

        var query = context.SystemErrorIncidents
            .AsNoTracking()
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

        // הוחלף מסינון בזיכרון (אחרי טעינת כל השורות) ל-subquery שמתורגם ל-SQL -
        // כי בלי זה, pagination לפי subsystem היה לא עקבי: היינו דפדפים לפי
        // העמוד *לפני* הסינון, ומקבלים עמודים עם פחות (או אפס) תוצאות אחריו
        if (!string.IsNullOrWhiteSpace(subsystem))
        {
            var errorCodesForSubsystem = context.ErrorCatalogs
                .Where(c => c.Subsystem == subsystem)
                .Select(c => c.ErrorCode);
            query = query.Where(i => errorCodesForSubsystem.Contains(i.ErrorCode));
        }

        var totalCount = await query.CountAsync(ct);

        var incidents = await query
            .Include(i => i.Details)
            .Include(i => i.Reporters).ThenInclude(r => r.User)
            .OrderByDescending(i => i.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        // Join "רך" מול הקטלוג (לא FK אמיתי) - כי תקרית עם קוד שגיאה שעוד לא
        // תועד בקטלוג עדיין חייבת להישמר ולהיות גלויה כאן. נעשה בזיכרון כי אין
        // הרבה שורות בקטלוג, ומאפשר לשלב עם ה-Include של Reporters למעלה
        var catalogs = await context.ErrorCatalogs.AsNoTracking().ToDictionaryAsync(c => c.ErrorCode, ct);

        var items = incidents.Select(i => MapToResponseDto(i, catalogs.GetValueOrDefault(i.ErrorCode))).ToList();

        return new PagedResultDto<IncidentResponseDto>(items, totalCount, page, pageSize);
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

        // נועל רק לפי (tenant, fingerprint) - דיווחים על תקריות *שונות* ממשיכים
        // להתעבד במקביל לגמרי בלי להמתין זה לזה. רק דיווחים על *אותה* תקרית
        // מתואמים כאן, שזה בדיוק המקרה שדורש את זה
        var incidentLock = GetIncidentLock(dto.TenantId, fingerprint);
        await incidentLock.WaitAsync(ct);
        try
        {
            return await IngestLockedAsync(dto, fingerprint, ct);
        }
        finally
        {
            incidentLock.Release();
        }
    }

    private async Task<IncidentResponseDto> IngestLockedAsync(CreateIncidentDto dto, string fingerprint, CancellationToken ct)
    {
        // בדיקת כפילות לפי האינדקס המורכב (TenantId, ErrorFingerprintHash) - אם
        // התקרית כבר קיימת ללקוח הזה, סופרים הישנות נוספת במקום ליצור שורה כפולה.
        // IgnoreQueryFilters כי אנחנו בתוך ה-Background Worker (בלי HttpContext) -
        // הסינון הרגיל היה מנסה להעריך CurrentTenantId ונופל; מסננים ידנית לפי
        // dto.TenantId שכבר הוחלף בערך המהימן ב-Controller
        var exists = await context.SystemErrorIncidents
            .IgnoreQueryFilters()
            .AnyAsync(i => i.TenantId == dto.TenantId && i.ErrorFingerprintHash == fingerprint, ct);

        long incidentId;

        if (exists)
        {
            incidentId = await ApplyToExistingIncidentAsync(dto.TenantId, fingerprint, dto, ct);
        }
        else
        {
            try
            {
                incidentId = await CreateNewIncidentAsync(dto, fingerprint, ct);
            }
            catch (DbUpdateException)
            {
                // מירוץ בהכנסה שעדיין אפשרי חרף הנעילה בתוך-תהליך: למשל אם
                // יום אחד יהיו כמה instances של ה-App Service (הנעילה כאן היא
                // per-process, לא משותפת ביניהם). האינדקס הייחודי ב-DB
                // (TenantId, ErrorFingerprintHash) הוא קו ההגנה השני, גלובלי
                context.ChangeTracker.Clear();
                incidentId = await ApplyToExistingIncidentAsync(dto.TenantId, fingerprint, dto, ct);
            }
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

    private const int MaxConcurrencyRetries = 5;

    // מקבל קריטריון חיפוש (לא ישות כבר-טעונה!) כי הוא טוען מחדש מהתחלה בכל
    // ניסיון. זה מה שמגן בפועל מול worker-ים מקבילים שעדכנו את *אותה* שורה
    // בדיוק בין הטעינה שלנו לשמירה: SystemErrorIncident.RowVersion (Optimistic
    // Concurrency) גורם אז ל-DbUpdateConcurrencyException - בלי retry שטוען
    // גרסה טרייה, זה היה אובדן עדכון שקט (הדיווח נזרק, לא נכתב בכלל)
    private async Task<long> ApplyToExistingIncidentAsync(string tenantId, string fingerprint, CreateIncidentDto dto, CancellationToken ct)
    {
        for (var attempt = 1; attempt <= MaxConcurrencyRetries; attempt++)
        {
            var existing = await context.SystemErrorIncidents
                .IgnoreQueryFilters()
                .Include(i => i.Reporters)
                .FirstAsync(i => i.TenantId == tenantId && i.ErrorFingerprintHash == fingerprint, ct);

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

            try
            {
                await context.SaveChangesAsync(ct);
                return existing.IncidentId;
            }
            catch (DbUpdateConcurrencyException) when (attempt < MaxConcurrencyRetries)
            {
                // worker מקביל אחר כבר שינה את ה-RowVersion בין הטעינה שלנו
                // לשמירה - מנקים את המעקב ומנסים שוב עם גרסה טרייה מה-DB
                context.ChangeTracker.Clear();
            }
        }

        // לא אמור לקרות בפועל (5 ניסיונות מול התנגשות אמיתית זה הרבה), אבל
        // עדיף חריגה ברורה על אובדן שקט אם זה בכל זאת קורה
        throw new InvalidOperationException(
            $"כשל בעדכון תקרית קיימת (Tenant={tenantId}, Fingerprint={fingerprint}) אחרי {MaxConcurrencyRetries} ניסיונות עקב התנגשויות מקבילות חוזרות");
    }

    private async Task<long> CreateNewIncidentAsync(CreateIncidentDto dto, string fingerprint, CancellationToken ct)
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
        return incident.IncidentId;
    }

    public async Task MarkAsResolvedAsync(long id, int? restrictToUserId = null, CancellationToken ct = default)
    {
        // שאילתת Where מפורשת (ולא FindAsync) כדי להבטיח שה-Global Query Filter
        // של ה-Tenant מוחל - כך תקרית של לקוח אחר תיחשב "לא נמצאה" ולא ניתנת לעדכון.
        // אותה הגנה כמו ב-GetIncidentByIdAsync: משתמש רגיל (restrictToUserId != null)
        // יכול לסגור רק תקרית שהוא עצמו בין המדווחים שלה, לא כל תקרית בטננט
        var incident = await context.SystemErrorIncidents
            .Include(i => i.Reporters)
            .FirstOrDefaultAsync(i => i.IncidentId == id, ct);

        if (incident is null || (restrictToUserId.HasValue && incident.Reporters.All(r => r.UserId != restrictToUserId.Value)))
        {
            throw new IncidentNotFoundException(id);
        }

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
