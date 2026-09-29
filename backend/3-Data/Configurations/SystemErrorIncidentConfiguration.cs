using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using MyBackendApi.Models.Entities;

namespace MyBackendApi.Data.Configurations;

public class SystemErrorIncidentConfiguration : IEntityTypeConfiguration<SystemErrorIncident>
{
    public void Configure(EntityTypeBuilder<SystemErrorIncident> builder)
    {
        builder.ToTable("SystemErrorIncidents");

        builder.HasKey(i => i.IncidentId);

        builder.Property(i => i.TenantId)
            .IsRequired()
            .HasMaxLength(64);

        builder.Property(i => i.ErrorFingerprintHash)
            .IsRequired()
            .HasMaxLength(64);

        builder.Property(i => i.ErrorCode)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(i => i.ErrorMessage)
            .IsRequired();

        // מונע דריסה שקטה כששני משתמשים עורכים/פותרים את אותה תקלה בו-זמנית -
        // SQL Server מעדכן את הערך אוטומטית בכל UPDATE, ו-EF Core בודק אותו לפני שמירה
        builder.Property(i => i.RowVersion)
            .IsRowVersion();

        // אינדקס מורכב קריטי: מאפשר לבדוק כפילות שגיאה עבור לקוח ספציפי ב-O(1)
        builder.HasIndex(i => new { i.TenantId, i.ErrorFingerprintHash })
            .HasDatabaseName("IX_SystemErrorIncidents_Tenant_Fingerprint");

        // קשר של 1 ל-1 עם טבלת ה-Payload הכבדה
        builder.HasOne(i => i.Details)
            .WithOne(d => d.Incident)
            .HasForeignKey<IncidentDetailPayload>(d => d.IncidentId)
            .OnDelete(DeleteBehavior.Cascade);

        // אין קשר EF/FK אמיתי לקטלוג השגיאות בכוונה - ראו הערה ב-SystemErrorIncident.cs
    }
}