using Microsoft.EntityFrameworkCore;
using MyBackendApi.Data;
using MyBackendApi.Exceptions;
using MyBackendApi.Models.Common;
using MyBackendApi.Models.DTOs.Ingestion;
using MyBackendApi.Models.DTOs.Responses;
using MyBackendApi.Models.Entities;
using MyBackendApi.Services.Auth;
using MyBackendApi.Services.Interfaces;

namespace MyBackendApi.Services.Core;

public class BugService(AppDbContext context, ICurrentUserProvider currentUserProvider) : IBugService
{
    // ראו הערה מקבילה ב-IncidentService - רשת ביטחון מפני payload לא חסום,
    // לא pagination מלא עם ניווט בין עמודים
    private const int MaxResults = 500;

    public async Task<IEnumerable<BugReportResponseDto>> GetAllBugsAsync(IncidentStatus? statusFilter = null, int? restrictToUserId = null, CancellationToken cancellationToken = default)
    {
        var query =
            from b in context.BugReports.AsNoTracking()
            join u in context.Users.AsNoTracking() on b.ReportedByUserId equals u.Id into userJoin
            from reporter in userJoin.DefaultIfEmpty()
            select new { Bug = b, ReporterName = reporter.FullName };

        if (statusFilter.HasValue)
        {
            query = query.Where(x => x.Bug.Status == statusFilter.Value);
        }

        // כל משתמש רואה רק את הבאגים שהוא עצמו דיווח - restrictToUserId מגיע null
        // רק כשהמזמין הוא Admin (נקבע ב-Controller)
        if (restrictToUserId.HasValue)
        {
            query = query.Where(x => x.Bug.ReportedByUserId == restrictToUserId.Value);
        }

        var rows = await query
            .OrderByDescending(x => x.Bug.CreatedAt)
            .Take(MaxResults)
            .ToListAsync(cancellationToken);
        return rows.Select(x => MapToResponseDto(x.Bug, x.ReporterName));
    }

    public async Task<BugReportResponseDto> GetBugByIdAsync(int id, int? restrictToUserId = null, CancellationToken cancellationToken = default)
    {
        var bug = await context.BugReports
            .AsNoTracking()
            .FirstOrDefaultAsync(b => b.Id == id, cancellationToken);

        if (bug is null || (restrictToUserId.HasValue && bug.ReportedByUserId != restrictToUserId.Value))
        {
            throw new BugNotFoundException(id);
        }

        var reporterName = bug.ReportedByUserId.HasValue
            ? await context.Users.AsNoTracking()
                .Where(u => u.Id == bug.ReportedByUserId.Value)
                .Select(u => u.FullName)
                .FirstOrDefaultAsync(cancellationToken)
            : null;

        return MapToResponseDto(bug, reporterName);
    }

    public async Task<BugReportResponseDto> CreateBugAsync(CreateBugReportDto dto, CancellationToken cancellationToken = default)
    {
        var bug = new BugReport
        {
            // ה-TenantId נלקח מהמשתמש המזוהה בבקשה (Global Query Filter), לא מגוף
            // הבקשה עצמו - אחרת לקוח יכול "לכתוב" רשומה תחת TenantId של מישהו אחר
            TenantId = context.CurrentTenantId,
            Title = dto.Title,
            Description = dto.Description,
            SystemModule = dto.SystemModule,
            Priority = dto.Priority,
            Status = IncidentStatus.New,
            ReportedByUserId = currentUserProvider.UserId
        };

        context.BugReports.Add(bug);
        await context.SaveChangesAsync(cancellationToken);

        var reporterName = bug.ReportedByUserId.HasValue
            ? await context.Users.AsNoTracking()
                .Where(u => u.Id == bug.ReportedByUserId.Value)
                .Select(u => u.FullName)
                .FirstOrDefaultAsync(cancellationToken)
            : null;

        return MapToResponseDto(bug, reporterName);
    }

    public async Task<BugReportResponseDto> UpdateBugStatusAsync(int id, IncidentStatus status, CancellationToken cancellationToken = default)
    {
        var bug = await context.BugReports.FirstOrDefaultAsync(b => b.Id == id, cancellationToken);
        if (bug is null) throw new BugNotFoundException(id);

        bug.Status = status;
        bug.ResolvedAt = status == IncidentStatus.Closed ? DateTime.UtcNow : null;

        await context.SaveChangesAsync(cancellationToken);

        var reporterName = bug.ReportedByUserId.HasValue
            ? await context.Users.AsNoTracking()
                .Where(u => u.Id == bug.ReportedByUserId.Value)
                .Select(u => u.FullName)
                .FirstOrDefaultAsync(cancellationToken)
            : null;

        return MapToResponseDto(bug, reporterName);
    }

    public async Task<bool> DeleteBugAsync(int id, CancellationToken cancellationToken = default)
    {
        // שאילתת Where מפורשת (ולא FindAsync) כדי להבטיח שה-Global Query Filter
        // של ה-Tenant מוחל - כך באג של לקוח אחר לא ניתן למחיקה
        var bug = await context.BugReports.FirstOrDefaultAsync(b => b.Id == id, cancellationToken);
        if (bug is null) return false;

        context.BugReports.Remove(bug);
        await context.SaveChangesAsync(cancellationToken);
        return true;
    }

    private static BugReportResponseDto MapToResponseDto(BugReport bug, string? reporterName = null) =>
        new(
            bug.Id,
            bug.TenantId,
            bug.Title,
            bug.Description,
            bug.SystemModule,
            bug.Priority,
            bug.Status,
            bug.CreatedAt,
            bug.ResolvedAt,
            bug.ReportedByUserId,
            reporterName
        );
}