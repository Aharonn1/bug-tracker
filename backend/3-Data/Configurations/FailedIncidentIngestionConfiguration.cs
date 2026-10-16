using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using MyBackendApi.Models.Entities;

namespace MyBackendApi.Data.Configurations;

public class FailedIncidentIngestionConfiguration : IEntityTypeConfiguration<FailedIncidentIngestion>
{
    public void Configure(EntityTypeBuilder<FailedIncidentIngestion> builder)
    {
        builder.ToTable("FailedIncidentIngestions");

        builder.HasKey(f => f.Id);

        builder.Property(f => f.TenantId).IsRequired().HasMaxLength(64);
        builder.Property(f => f.DtoJson).IsRequired();
        builder.Property(f => f.ErrorMessage).IsRequired();

        // תומך בשתי השאילתות העיקריות: "הלא-פתורות" (ה-endpoint) ו"הלא-פתורות
        // שעדיין לא עברו את תקרת הניסיונות" (ה-Worker התקופתי)
        builder.HasIndex(f => new { f.ResolvedAt, f.AttemptCount });
    }
}
