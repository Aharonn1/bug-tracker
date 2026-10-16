using Microsoft.EntityFrameworkCore;
using MyBackendApi.Data;
using MyBackendApi.Models.DTOs.Responses;
using MyBackendApi.Services.Interfaces;

namespace MyBackendApi.Services.Core;

public class UserDirectoryService(AppDbContext context) : IUserDirectoryService
{
    // לא קוראים ל-IgnoreQueryFilters כאן בכוונה - ה-Global Query Filter כבר
    // עוקף את בידוד ה-TenantId בעצמו עבור SiteAdmin (ראו AppDbContext).
    // זהו נקרא רק מתוך UsersController שכבר חוסם גישה לכל מי שאינו SiteAdmin
    public async Task<IReadOnlyList<UserSummaryDto>> GetAllUsersAsync(CancellationToken ct = default)
    {
        return await context.Users
            .AsNoTracking()
            .OrderBy(u => u.TenantId)
            .ThenByDescending(u => u.Role)
            .ThenBy(u => u.Id)
            .Select(u => new UserSummaryDto(u.Id, u.FullName, u.Email, u.Role, u.TenantId))
            .ToListAsync(ct);
    }
}
