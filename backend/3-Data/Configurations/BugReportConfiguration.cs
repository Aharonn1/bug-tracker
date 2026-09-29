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
    }
}
