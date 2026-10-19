using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using MyBackendApi.Models.Entities;

namespace MyBackendApi.Data.Configurations;

public class BlockedIpAddressConfiguration : IEntityTypeConfiguration<BlockedIpAddress>
{
    public void Configure(EntityTypeBuilder<BlockedIpAddress> builder)
    {
        builder.ToTable("BlockedIpAddresses");

        builder.HasKey(b => b.Id);

        builder.Property(b => b.IpAddress).IsRequired().HasMaxLength(64);
        builder.Property(b => b.Reason).IsRequired().HasMaxLength(256);

        // שורה אחת-לכל-IP - upsert, לא היסטוריה
        builder.HasIndex(b => b.IpAddress).IsUnique();
    }
}
