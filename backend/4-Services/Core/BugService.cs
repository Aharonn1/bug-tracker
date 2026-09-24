using Microsoft.EntityFrameworkCore;
using MyBackendApi.Data;
using MyBackendApi.Exceptions;
using MyBackendApi.Models.Common;
using MyBackendApi.Models.DTOs.Ingestion;
using MyBackendApi.Models.DTOs.Responses;
using MyBackendApi.Models.Entities;
using MyBackendApi.Services.Interfaces;

namespace MyBackendApi.Services.Core;

public class BugService(AppDbContext context) : IBugService
{
    public async Task<IEnumerable<BugReportResponseDto>> GetAllBugsAsync(IncidentStatus? statusFilter = null, CancellationToken cancellationToken = default)
    {
        var query = context.BugReports.AsNoTracking().AsQueryable();

        if (statusFilter.HasValue)
        {
            query = query.Where(b => b.Status == statusFilter.Value);
        }

        var bugs = await query.ToListAsync(cancellationToken);
        return bugs.Select(MapToResponseDto);
    }

    public async Task<BugReportResponseDto> GetBugByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        var bug = await context.BugReports
            .AsNoTracking()
            .FirstOrDefaultAsync(b => b.Id == id, cancellationToken);

        return bug is not null ? MapToResponseDto(bug) : throw new BugNotFoundException(id);
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
            Status = IncidentStatus.New
        };

        context.BugReports.Add(bug);
        await context.SaveChangesAsync(cancellationToken);

        return MapToResponseDto(bug);
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

    private static BugReportResponseDto MapToResponseDto(BugReport bug) =>
        new(
            bug.Id,
            bug.TenantId,
            bug.Title,
            bug.Description,
            bug.SystemModule,
            bug.Priority,
            bug.Status,
            bug.CreatedAt,
            bug.ResolvedAt
        );
}