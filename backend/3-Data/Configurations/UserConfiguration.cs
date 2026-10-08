using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using MyBackendApi.Models.Common;
using MyBackendApi.Models.Entities;

namespace MyBackendApi.Data.Configurations;

public class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.ToTable("Users");

        builder.HasKey(u => u.Id);

        builder.Property(u => u.FullName).HasMaxLength(120).IsRequired();
        builder.Property(u => u.Email).HasMaxLength(256).IsRequired();
        builder.Property(u => u.PasswordHash).IsRequired();
        builder.Property(u => u.Role).IsRequired();

        // אימייל משמש כשם המשתמש בהתחברות - ייחודי *בתוך אותו לקוח*, לא גלובלית
        // בכל המערכת. ייחודיות גלובלית הייתה אומרת ששני משרדים שונים לא יכולים
        // להשתמש באותה כתובת אימייל בכלל - פגיעה אמיתית בבידוד בין לקוחות
        // (Multi-Tenancy), לא רק עניין טכני
        builder.HasIndex(u => new { u.TenantId, u.Email }).IsUnique();

        // ארבעה משתמשי seed ראשוניים - הסיסמאות כבר עברו hash (PBKDF2 דרך
        // Microsoft.AspNetCore.Identity.PasswordHasher) לפני שהוזנו כאן; הסיסמאות
        // הגולמיות נמסרו למשתמש פעם אחת בזמן היצירה ולעולם לא נשמרות בקוד
        builder.HasData(
            new User
            {
                Id = 1,
                FullName = "אהרון הלוי",
                Email = "aharon.halevy@lawfirm.co.il",
                PasswordHash = "AQAAAAIAAYagAAAAEC1Wb2k1xvIBk3h4pb0eY5gJy8M01dZhT4WIsY+Wl1WfPZBZi+jUD6S7nz0/Ml9YVg==",
                Role = UserRole.Admin,
                IsActive = true,
                TenantId = "default-tenant",
                CreatedAt = new DateTime(2026, 9, 28, 0, 0, 0, DateTimeKind.Utc)
            },
            new User
            {
                Id = 2,
                FullName = "נועה כהן",
                Email = "noa.cohen@lawfirm.co.il",
                PasswordHash = "AQAAAAIAAYagAAAAEC1Wb2k1xvIBk3h4pb0eY5gJy8M01dZhT4WIsY+Wl1WfPZBZi+jUD6S7nz0/Ml9YVg==",
                Role = UserRole.User,
                IsActive = true,
                TenantId = "default-tenant",
                CreatedAt = new DateTime(2026, 9, 28, 0, 0, 0, DateTimeKind.Utc)
            },
            new User
            {
                Id = 3,
                FullName = "איתי מזרחי",
                Email = "itai.mizrahi@lawfirm.co.il",
                PasswordHash = "AQAAAAIAAYagAAAAEC1Wb2k1xvIBk3h4pb0eY5gJy8M01dZhT4WIsY+Wl1WfPZBZi+jUD6S7nz0/Ml9YVg==",
                Role = UserRole.User,
                IsActive = true,
                TenantId = "default-tenant",
                CreatedAt = new DateTime(2026, 9, 28, 0, 0, 0, DateTimeKind.Utc)
            },
            new User
            {
                Id = 4,
                FullName = "שירה בן-דוד",
                Email = "shira.bendavid@lawfirm.co.il",
                PasswordHash = "AQAAAAIAAYagAAAAEC1Wb2k1xvIBk3h4pb0eY5gJy8M01dZhT4WIsY+Wl1WfPZBZi+jUD6S7nz0/Ml9YVg==",
                Role = UserRole.User,
                IsActive = true,
                TenantId = "default-tenant",
                CreatedAt = new DateTime(2026, 9, 28, 0, 0, 0, DateTimeKind.Utc)
            }
        );
    }
}
