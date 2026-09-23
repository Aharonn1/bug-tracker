using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using MyBackendApi.Models.Entities;

namespace MyBackendApi.Data.Configurations;

public class IncidentDetailPayloadConfiguration : IEntityTypeConfiguration<IncidentDetailPayload>
{
    public void Configure(EntityTypeBuilder<IncidentDetailPayload> builder)
    {
        builder.ToTable("IncidentDetailPayloads");

        builder.HasKey(d => d.IncidentId);

        // שדות ללא הגבלת אורך מוגדרים עבור StackTrace ו-JSON גולמי
        builder.Property(d => d.StackTrace);
        builder.Property(d => d.RawPayload);
    }
}