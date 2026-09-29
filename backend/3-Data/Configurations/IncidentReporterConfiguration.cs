using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using MyBackendApi.Models.Entities;

namespace MyBackendApi.Data.Configurations;

public class IncidentReporterConfiguration : IEntityTypeConfiguration<IncidentReporter>
{
    public void Configure(EntityTypeBuilder<IncidentReporter> builder)
    {
        builder.ToTable("IncidentReporters");

        builder.HasKey(r => new { r.IncidentId, r.UserId });

        builder.HasOne(r => r.Incident)
            .WithMany(i => i.Reporters)
            .HasForeignKey(r => r.IncidentId)
            .OnDelete(DeleteBehavior.Cascade);

        // Cascade גם כאן - אם משתמש יימחק בעתיד, מוחקים רק את שורת הקישור שלו
        // (לא את התקרית עצמה, שיכולה עדיין להיות משויכת למשתמשים אחרים)
        builder.HasOne(r => r.User)
            .WithMany()
            .HasForeignKey(r => r.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
