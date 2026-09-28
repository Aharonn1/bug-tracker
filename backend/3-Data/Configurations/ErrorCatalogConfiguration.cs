using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using MyBackendApi.Models.Common;
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

        // קטלוג בסיסי לקודי שגיאה שנוצרים אוטומטית ע"י המערכת עצמה (לא מגיעים
        // משער ממשלתי חיצוני) - בלי רשומה כאן הם מוצגים כ-"General"/"Unknown"
        // בכל מקום שמציג קטגוריה, למרות שהמקור שלהם ידוע וקבוע מראש בקוד
        builder.HasData(new ErrorCatalog
        {
            ErrorCode = "CLIENT_NETWORK_DEGRADED",
            Category = "Client-Side/Network",
            Subsystem = "WebClient",
            SeverityLevel = IncidentSeverity.Medium,
            HebrewDescription = "זוהתה האטה או אובדן חבילות ברשת בעמדת הלקוח (latency גבוה/ping נכשל) - מזוהה אוטומטית ע\"י בדיקת קישוריות בדפדפן",
            ResolutionPlaybook = "1. לבדוק את יציבות חיבור הרשת (Wi-Fi/כבל) בעמדת הלקוח. 2. להפעיל מחדש את הנתב/המחשב. 3. אם ממשיך, לבדוק תחזוקה מתוכננת אצל ספק האינטרנט או VPN פעיל שמאט את התעבורה.",
            TenantId = string.Empty,
            CreatedAt = new DateTime(2026, 9, 28, 0, 0, 0, DateTimeKind.Utc)
        });
    }
}