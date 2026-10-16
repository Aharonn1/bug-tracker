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
                // הועלה מ-Admin ל-SiteAdmin - מקבל התראות על תקריות מכל הלקוחות,
                // לא רק מ-default-tenant. default-tenant קיבל מנהל-משרד חדש משלו (Id 2)
                Role = UserRole.SiteAdmin,
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
                // הועלתה מ-User ל-Admin - מנהלת-המשרד של default-tenant אחרי שאהרון עבר ל-SiteAdmin
                Role = UserRole.Admin,
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
            },

            // שלושה לקוחות (משרדים) נוספים, 5 משתמשים כל אחד - מדגימים את שכבת
            // ה-Admin כ"מנהל משרד" פר-לקוח, לצד ה-SiteAdmin חוצה-הלקוחות (Id 1).
            // אותה סיסמה וה-hash הקיים (123456) - ראו הערה למעלה
            new User { Id = 5, FullName = "דנה כהן-גולד", Email = "dana.cohengold@cohen-gold-law.co.il", PasswordHash = "AQAAAAIAAYagAAAAEC1Wb2k1xvIBk3h4pb0eY5gJy8M01dZhT4WIsY+Wl1WfPZBZi+jUD6S7nz0/Ml9YVg==", Role = UserRole.Admin, IsActive = true, TenantId = "cohen-gold-law", CreatedAt = new DateTime(2026, 10, 16, 0, 0, 0, DateTimeKind.Utc) },
            new User { Id = 6, FullName = "יואב שפירא", Email = "yoav.shapira@cohen-gold-law.co.il", PasswordHash = "AQAAAAIAAYagAAAAEC1Wb2k1xvIBk3h4pb0eY5gJy8M01dZhT4WIsY+Wl1WfPZBZi+jUD6S7nz0/Ml9YVg==", Role = UserRole.User, IsActive = true, TenantId = "cohen-gold-law", CreatedAt = new DateTime(2026, 10, 16, 0, 0, 0, DateTimeKind.Utc) },
            new User { Id = 7, FullName = "מיכל אברהם", Email = "michal.avraham@cohen-gold-law.co.il", PasswordHash = "AQAAAAIAAYagAAAAEC1Wb2k1xvIBk3h4pb0eY5gJy8M01dZhT4WIsY+Wl1WfPZBZi+jUD6S7nz0/Ml9YVg==", Role = UserRole.User, IsActive = true, TenantId = "cohen-gold-law", CreatedAt = new DateTime(2026, 10, 16, 0, 0, 0, DateTimeKind.Utc) },
            new User { Id = 8, FullName = "רון פרידמן", Email = "ron.friedman@cohen-gold-law.co.il", PasswordHash = "AQAAAAIAAYagAAAAEC1Wb2k1xvIBk3h4pb0eY5gJy8M01dZhT4WIsY+Wl1WfPZBZi+jUD6S7nz0/Ml9YVg==", Role = UserRole.User, IsActive = true, TenantId = "cohen-gold-law", CreatedAt = new DateTime(2026, 10, 16, 0, 0, 0, DateTimeKind.Utc) },
            new User { Id = 9, FullName = "טל נחמיאס", Email = "tal.nachmias@cohen-gold-law.co.il", PasswordHash = "AQAAAAIAAYagAAAAEC1Wb2k1xvIBk3h4pb0eY5gJy8M01dZhT4WIsY+Wl1WfPZBZi+jUD6S7nz0/Ml9YVg==", Role = UserRole.User, IsActive = true, TenantId = "cohen-gold-law", CreatedAt = new DateTime(2026, 10, 16, 0, 0, 0, DateTimeKind.Utc) },

            new User { Id = 10, FullName = "עומר מזרחי", Email = "omer.mizrahi@mizrahi-partners.co.il", PasswordHash = "AQAAAAIAAYagAAAAEC1Wb2k1xvIBk3h4pb0eY5gJy8M01dZhT4WIsY+Wl1WfPZBZi+jUD6S7nz0/Ml9YVg==", Role = UserRole.Admin, IsActive = true, TenantId = "mizrahi-partners", CreatedAt = new DateTime(2026, 10, 16, 0, 0, 0, DateTimeKind.Utc) },
            new User { Id = 11, FullName = "ליאת גבאי", Email = "liat.gabay@mizrahi-partners.co.il", PasswordHash = "AQAAAAIAAYagAAAAEC1Wb2k1xvIBk3h4pb0eY5gJy8M01dZhT4WIsY+Wl1WfPZBZi+jUD6S7nz0/Ml9YVg==", Role = UserRole.User, IsActive = true, TenantId = "mizrahi-partners", CreatedAt = new DateTime(2026, 10, 16, 0, 0, 0, DateTimeKind.Utc) },
            new User { Id = 12, FullName = "אסף ביטון", Email = "asaf.biton@mizrahi-partners.co.il", PasswordHash = "AQAAAAIAAYagAAAAEC1Wb2k1xvIBk3h4pb0eY5gJy8M01dZhT4WIsY+Wl1WfPZBZi+jUD6S7nz0/Ml9YVg==", Role = UserRole.User, IsActive = true, TenantId = "mizrahi-partners", CreatedAt = new DateTime(2026, 10, 16, 0, 0, 0, DateTimeKind.Utc) },
            new User { Id = 13, FullName = "הדר שלום", Email = "hadar.shalom@mizrahi-partners.co.il", PasswordHash = "AQAAAAIAAYagAAAAEC1Wb2k1xvIBk3h4pb0eY5gJy8M01dZhT4WIsY+Wl1WfPZBZi+jUD6S7nz0/Ml9YVg==", Role = UserRole.User, IsActive = true, TenantId = "mizrahi-partners", CreatedAt = new DateTime(2026, 10, 16, 0, 0, 0, DateTimeKind.Utc) },
            new User { Id = 14, FullName = "גיל אוחיון", Email = "gil.ohayon@mizrahi-partners.co.il", PasswordHash = "AQAAAAIAAYagAAAAEC1Wb2k1xvIBk3h4pb0eY5gJy8M01dZhT4WIsY+Wl1WfPZBZi+jUD6S7nz0/Ml9YVg==", Role = UserRole.User, IsActive = true, TenantId = "mizrahi-partners", CreatedAt = new DateTime(2026, 10, 16, 0, 0, 0, DateTimeKind.Utc) },

            new User { Id = 15, FullName = "רותם בן-עמי", Email = "rotem.benami@ben-ami-legal.co.il", PasswordHash = "AQAAAAIAAYagAAAAEC1Wb2k1xvIBk3h4pb0eY5gJy8M01dZhT4WIsY+Wl1WfPZBZi+jUD6S7nz0/Ml9YVg==", Role = UserRole.Admin, IsActive = true, TenantId = "ben-ami-legal", CreatedAt = new DateTime(2026, 10, 16, 0, 0, 0, DateTimeKind.Utc) },
            new User { Id = 16, FullName = "שחר לוין", Email = "shahar.levin@ben-ami-legal.co.il", PasswordHash = "AQAAAAIAAYagAAAAEC1Wb2k1xvIBk3h4pb0eY5gJy8M01dZhT4WIsY+Wl1WfPZBZi+jUD6S7nz0/Ml9YVg==", Role = UserRole.User, IsActive = true, TenantId = "ben-ami-legal", CreatedAt = new DateTime(2026, 10, 16, 0, 0, 0, DateTimeKind.Utc) },
            new User { Id = 17, FullName = "נטע ישראלי", Email = "neta.israeli@ben-ami-legal.co.il", PasswordHash = "AQAAAAIAAYagAAAAEC1Wb2k1xvIBk3h4pb0eY5gJy8M01dZhT4WIsY+Wl1WfPZBZi+jUD6S7nz0/Ml9YVg==", Role = UserRole.User, IsActive = true, TenantId = "ben-ami-legal", CreatedAt = new DateTime(2026, 10, 16, 0, 0, 0, DateTimeKind.Utc) },
            new User { Id = 18, FullName = "אור צוקרמן", Email = "or.zuckerman@ben-ami-legal.co.il", PasswordHash = "AQAAAAIAAYagAAAAEC1Wb2k1xvIBk3h4pb0eY5gJy8M01dZhT4WIsY+Wl1WfPZBZi+jUD6S7nz0/Ml9YVg==", Role = UserRole.User, IsActive = true, TenantId = "ben-ami-legal", CreatedAt = new DateTime(2026, 10, 16, 0, 0, 0, DateTimeKind.Utc) },
            new User { Id = 19, FullName = "ספיר חדד", Email = "sapir.hadad@ben-ami-legal.co.il", PasswordHash = "AQAAAAIAAYagAAAAEC1Wb2k1xvIBk3h4pb0eY5gJy8M01dZhT4WIsY+Wl1WfPZBZi+jUD6S7nz0/Ml9YVg==", Role = UserRole.User, IsActive = true, TenantId = "ben-ami-legal", CreatedAt = new DateTime(2026, 10, 16, 0, 0, 0, DateTimeKind.Utc) }
        );
    }
}
