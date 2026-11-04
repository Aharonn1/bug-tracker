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
    // Take קבוע (לא פרמטר - אין היום UI שתומך בעימוד למסך הזה) - בלי זה,
    // זו שאילתה חוצת-טננטים ללא הגבלה בכלל: אלפי לקוחות כפול כמה משתמשים
    // כל אחד הופכים את זה בקלות לעשרות אלפי שורות בתשובה אחת. 5000 נדיב
    // דיו שלא "יחתוך" תפעולית בפועל כרגע, אבל עדיין חוסם צמיחה בלתי מוגבלת
    private const int MaxUsersReturned = 5000;

    public async Task<IReadOnlyList<UserSummaryDto>> GetAllUsersAsync(CancellationToken ct = default)
    {
        return await context.Users
            .AsNoTracking()
            .OrderBy(u => u.TenantId)
            .ThenByDescending(u => u.Role)
            .ThenBy(u => u.Id)
            .Select(u => new UserSummaryDto(u.Id, u.FullName, u.Email, u.Role, u.TenantId))
            .Take(MaxUsersReturned)
            .ToListAsync(ct);
    }

    public async Task MarkIncidentsViewedAsync(int userId, CancellationToken ct = default)
    {
        var user = await context.Users.FirstOrDefaultAsync(u => u.Id == userId, ct);
        if (user is null) return; // הגנתי בלבד - לא אמור לקרות למשתמש מאומת
        user.IncidentsLastViewedAt = DateTime.UtcNow;
        await context.SaveChangesAsync(ct);
    }

    public Task<DateTime?> GetIncidentsLastViewedAtAsync(int userId, CancellationToken ct = default) =>
        context.Users.Where(u => u.Id == userId).Select(u => u.IncidentsLastViewedAt).FirstOrDefaultAsync(ct);
}
