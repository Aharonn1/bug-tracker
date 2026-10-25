namespace MyBackendApi.Models.Entities;

// רשומת תפעול/אבטחה (כמו LoginAttempt) - לא נתון עסקי per-tenant, אז בלי
// TenantId משלה ובלי Global Query Filter. UserId כבר מזהה את הלקוח בעקיפין
// דרך User.TenantId, וחיפוש טוקן הוא תמיד גלובלי (הטוקן עצמו הוא המזהה
// היחיד שצריך - הלינק באימייל לא נושא עמו הקשר של tenant)
public class PasswordResetToken
{
    public long Id { get; set; }

    public int UserId { get; set; }
    public User User { get; set; } = null!;

    // לעולם לא נשמר הטוקן הגולמי - רק ה-hash שלו (SHA-256). דליפת הטבלה
    // הזו (למשל גיבוי שדלף) לא הייתה מספיקה לאף אחד לאפס סיסמה בעצמו
    public string TokenHash { get; set; } = string.Empty;

    public DateTime ExpiresAt { get; set; }
    public DateTime? UsedAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
