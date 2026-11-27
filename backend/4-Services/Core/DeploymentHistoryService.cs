using Microsoft.EntityFrameworkCore;
using MyBackendApi.Data;
using MyBackendApi.Models.Entities;

namespace MyBackendApi.Services.Core;

public class DeploymentHistoryService(AppDbContext db)
{
    public async Task RecordDeploymentAsync(string component, string commitSha, CancellationToken ct = default)
    {
        db.DeploymentRecords.Add(new DeploymentRecord
        {
            Component = component,
            CommitSha = commitSha,
            DeployedAt = DateTime.UtcNow
        });
        await db.SaveChangesAsync(ct);
    }

    // נטען פעם אחת ומועבר ל-IncidentService.MapToResponseDto לכל הרשימה -
    // לא שאילתה בודדת לכל תקרית (N+1). הטבלה גדלה בכ-2 שורות לכל push,
    // זניח בגודל גם אחרי שנים, אז טעינה מלאה ל-memory סבירה
    public Task<List<DeploymentRecord>> GetAllAsync(CancellationToken ct = default) =>
        db.DeploymentRecords.AsNoTracking().ToListAsync(ct);

    // לשימוש נקודתי (ה-RCA agent, תקרית בודדת) - לא צריך לטעון הכל
    public Task<DeploymentRecord?> GetLastDeployBeforeAsync(string component, DateTime before, CancellationToken ct = default) =>
        db.DeploymentRecords
            .AsNoTracking()
            .Where(d => d.Component == component && d.DeployedAt <= before)
            .OrderByDescending(d => d.DeployedAt)
            .FirstOrDefaultAsync(ct);

    // ההפך מ-GetLastDeployBeforeAsync - דיפלויים *אחרי* זמן נתון. משמש כדי
    // לרמוז לסוכן ה-AI "ייתכן שהקוד כבר השתנה מאז התקרית, אולי הבעיה כבר
    // טופלה" - בלי זה אין שום דרך לדעת את זה, לא מה-DB ולא מה-AI עצמו
    public Task<List<DeploymentRecord>> GetDeploysSinceAsync(string component, DateTime since, CancellationToken ct = default) =>
        db.DeploymentRecords
            .AsNoTracking()
            .Where(d => d.Component == component && d.DeployedAt > since)
            .OrderBy(d => d.DeployedAt)
            .ToListAsync(ct);
}
