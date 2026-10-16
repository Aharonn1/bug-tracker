namespace MyBackendApi.Models.Common;

public enum UserRole : byte
{
    User = 1,
    Admin = 2,

    // מנהל-על חוצה-לקוחות (לא לקוח ספציפי) - רואה ומקבל התראות על תקריות
    // מכל הלקוחות, לא רק מהלקוח שלו. ה-Global Query Filter ב-AppDbContext
    // עוקף את בידוד ה-TenantId עבור תפקיד זה בלבד
    SiteAdmin = 3
}
