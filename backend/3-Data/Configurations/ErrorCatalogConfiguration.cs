using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using MyBackendApi.Models.Entities;

namespace MyBackendApi.Data.Configurations;

public class ErrorCatalogConfiguration : IEntityTypeConfiguration<ErrorCatalog>
{
    public void Configure(EntityTypeBuilder<ErrorCatalog> builder)
    {
        builder.ToTable("ErrorCatalogs");

        builder.HasKey(e => e.ErrorCode);

        builder.Property(e => e.ErrorCode).HasMaxLength(50);
        builder.Property(e => e.Category).HasMaxLength(100).IsRequired();
        builder.Property(e => e.Subsystem).HasMaxLength(100).IsRequired();
        builder.Property(e => e.HebrewDescription).HasMaxLength(255).IsRequired();

        // שמירת ה-Enum כמספר קטן
        builder.Property(e => e.SeverityLevel).IsRequired();
    }
}