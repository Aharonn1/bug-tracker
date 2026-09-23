using System.Reflection;
using Microsoft.EntityFrameworkCore;
using MyBackendApi.Models.Entities;

namespace MyBackendApi.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<BugReport> BugReports => Set<BugReport>();
    public DbSet<ErrorCatalog> ErrorCatalogs => Set<ErrorCatalog>();
    public DbSet<SystemErrorIncident> SystemErrorIncidents => Set<SystemErrorIncident>();
    public DbSet<IncidentDetailPayload> IncidentDetailPayloads => Set<IncidentDetailPayload>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // טוען אוטומטית את כל ה-Configurations מה-Assembly בלי ללכלך את ה-Context
        modelBuilder.ApplyConfigurationsFromAssembly(Assembly.GetExecutingAssembly());
    }
}