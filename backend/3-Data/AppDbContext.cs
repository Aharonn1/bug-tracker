using System.Reflection;
using Microsoft.EntityFrameworkCore;
using MyBackendApi.Models.Entities;
using MyBackendApi.Services.Tenancy;

namespace MyBackendApi.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options, ICurrentTenantProvider tenantProvider) : DbContext(options)
{
    public DbSet<BugReport> BugReports => Set<BugReport>();
    public DbSet<ErrorCatalog> ErrorCatalogs => Set<ErrorCatalog>();
    public DbSet<SystemErrorIncident> SystemErrorIncidents => Set<SystemErrorIncident>();
    public DbSet<IncidentDetailPayload> IncidentDetailPayloads => Set<IncidentDetailPayload>();

    // חשוף כ-property על ה-Context עצמו (ולא כקריאה ישירה ל-tenantProvider בתוך ה-lambda)
    // כי כך EF Core יודע לתרגם את ה-Global Query Filter למשתנה שמוערך בזמן ריצת השאילתה
    public string CurrentTenantId => tenantProvider.TenantId;

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // טוען אוטומטית את כל ה-Configurations מה-Assembly בלי ללכלך את ה-Context
        modelBuilder.ApplyConfigurationsFromAssembly(Assembly.GetExecutingAssembly());

        // Global Query Filter - מונע דליפת מידע בין לקוחות (Multi-Tenancy): כל שאילתת
        // קריאה על ישויות עם TenantId תסונן אוטומטית ללקוח הנוכחי, בלי אפשרות "לשכוח"
        // להוסיף את הסינון הזה ידנית במקום חדש בעתיד
        modelBuilder.Entity<SystemErrorIncident>().HasQueryFilter(e => e.TenantId == CurrentTenantId);
        modelBuilder.Entity<BugReport>().HasQueryFilter(e => e.TenantId == CurrentTenantId);

        // IncidentDetailPayload אין לו TenantId משלו, אבל הוא הצד "החובה" ביחס 1:1
        // עם SystemErrorIncident שכבר מסונן - בלי סינון תואם כאן EF Core מזהיר
        // (ותיעודית ממליץ) שאפשר לקבל תוצאות לא עקביות בטעינת הניווט ביניהם
        modelBuilder.Entity<IncidentDetailPayload>().HasQueryFilter(d => d.Incident.TenantId == CurrentTenantId);
    }
}