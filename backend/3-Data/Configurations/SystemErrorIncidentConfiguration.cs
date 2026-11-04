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

        // אינדקס מורכב קריטי: מאפשר לבדוק כפילות שגיאה עבור לקוח ספציפי ב-O(1).
        // IsUnique - לא רק לביצועים: אוכף ברמת ה-DB שלא יכולות להיווצר שתי
        // תקריות עם אותה חתימה לאותו לקוח, גם אם שני worker-ים מעבדים בו-זמנית
        // (ראו IncidentIngestionWorker/IncidentService.IngestIncidentAsync) -
        // בלי זה, מירוץ בין שני עיבודים מקבילים יכול היה ליצור כפילות שקטה
        builder.HasIndex(i => new { i.TenantId, i.ErrorFingerprintHash })
            .IsUnique()
            .HasDatabaseName("IX_SystemErrorIncidents_Tenant_Fingerprint");

        // מכסה את השאילתה הכי נפוצה באפליקציה: רשימת התקריות (מסך ה-NOC) -
        // תמיד מסוננת לפי TenantId (Global Query Filter, על כל שאילתה) וממוינת
        // לפי CreatedAt יורד. בלי האינדקס הזה, כל טעינת רשימה אצל כל לקוח
        // הייתה נשענת על סריקת כל התקריות של אותו Tenant (אין אינדקס תומך
        // ל-ORDER BY) - בקנה מידה של אלפי לקוחות עם היסטוריה מצטברת, זה רק
        // מחמיר עם הזמן. לא ייחודי (אין אילוץ, רק ביצועים)
        builder.HasIndex(i => new { i.TenantId, i.CreatedAt })
            .HasDatabaseName("IX_SystemErrorIncidents_Tenant_CreatedAt");

        // קשר של 1 ל-1 עם טבלת ה-Payload הכבדה
        builder.HasOne(i => i.Details)
            .WithOne(d => d.Incident)
            .HasForeignKey<IncidentDetailPayload>(d => d.IncidentId)
            .OnDelete(DeleteBehavior.Cascade);

        // אין קשר EF/FK אמיתי לקטלוג השגיאות בכוונה - ראו הערה ב-SystemErrorIncident.cs
    }
}