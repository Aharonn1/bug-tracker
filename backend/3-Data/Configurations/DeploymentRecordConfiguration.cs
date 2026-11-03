using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using MyBackendApi.Models.Entities;

namespace MyBackendApi.Data.Configurations;

public class DeploymentRecordConfiguration : IEntityTypeConfiguration<DeploymentRecord>
{
    public void Configure(EntityTypeBuilder<DeploymentRecord> builder)
    {
        builder.ToTable("DeploymentRecords");

        builder.HasKey(d => d.Id);

        builder.Property(d => d.Component).IsRequired().HasMaxLength(20);
        builder.Property(d => d.CommitSha).IsRequired().HasMaxLength(40);

        // "הדיפלוי האחרון של component לפני זמן X" - בדיוק הצורה שבה
        // ResolveCodeLocationRef/GetLastDeployBeforeAsync שואלים את זה
        builder.HasIndex(d => new { d.Component, d.DeployedAt });
    }
}
