using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using MyBackendApi.Models.Entities;

namespace MyBackendApi.Data.Configurations;

public class AzureAlertOccurrenceConfiguration : IEntityTypeConfiguration<AzureAlertOccurrence>
{
    public void Configure(EntityTypeBuilder<AzureAlertOccurrence> builder)
    {
        builder.ToTable("AzureAlertOccurrences");

        builder.HasKey(a => a.Id);

        builder.Property(a => a.TenantId).IsRequired().HasMaxLength(64);
        builder.Property(a => a.AlertType).IsRequired().HasMaxLength(200);

        // כל שאילתת סיכום חודשי מסננת לפי טווח FiredAt - אינדקס מרוכב כדי
        // שזה יישאר מהיר גם אחרי שהטבלה תצבור חודשים רבים של רשומות
        builder.HasIndex(a => new { a.TenantId, a.FiredAt });
    }
}
