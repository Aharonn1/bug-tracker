using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using MyBackendApi.Models.Entities;

namespace MyBackendApi.Data.Configurations;

public class BugReportConfiguration : IEntityTypeConfiguration<BugReport>
{
    public void Configure(EntityTypeBuilder<BugReport> builder)
    {
        // SetNull ולא Cascade/Restrict - אם משתמש יימחק בעתיד, הבאגים שדיווח
        // צריכים להישאר, רק בלי שיוך למשתמש
        builder.HasOne(b => b.ReportedByUser)
            .WithMany()
            .HasForeignKey(b => b.ReportedByUserId)
            .OnDelete(DeleteBehavior.SetNull);

        // חסר היה עד כה - בלי זה כל שאילתת "רשימת באגים ללקוח" (ה-Global Query
        // Filter על TenantId, ממוין לפי CreatedAt) עושה סריקה מלאה של הטבלה.
        // TenantId ראשון כי זה תמיד חלק מהסינון; CreatedAt שני כי זה סדר התצוגה
        builder.HasIndex(b => new { b.TenantId, b.CreatedAt });
    }
}
