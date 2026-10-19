using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using MyBackendApi.Models.Entities;

namespace MyBackendApi.Data.Configurations;

public class LoginAttemptConfiguration : IEntityTypeConfiguration<LoginAttempt>
{
    public void Configure(EntityTypeBuilder<LoginAttempt> builder)
    {
        builder.ToTable("LoginAttempts");

        builder.HasKey(a => a.Id);

        builder.Property(a => a.Email).IsRequired().HasMaxLength(256);
        builder.Property(a => a.IpAddress).IsRequired().HasMaxLength(64);
        builder.Property(a => a.TenantId).HasMaxLength(64);

        // תומך בשאילתת האסקלציה (IP + חלון זמן) וברשימת הביקורת (מיון לפי זמן)
        builder.HasIndex(a => new { a.IpAddress, a.AttemptedAt });
        builder.HasIndex(a => a.AttemptedAt);
    }
}
