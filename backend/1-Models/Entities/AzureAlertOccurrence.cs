using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MyBackendApi.Models.Entities;

// לוג "הוספה בלבד" של כל קריאת webhook מ-Azure Monitor, בנפרד לגמרי מ-
// SystemErrorIncidents. הטבלה ההיא מבצעת דה-דופליקציה לפי Fingerprint (קוד
// שגיאה+הודעה) - שתי התרעות CPU גבוה באותו ניסוח מתמזגות לשורה אחת עם
// OccurrencesCount מצטבר, בלי לשמור מתי כל הפעלה בודדת קרתה. זה מושלם
// לטבלת התקריות (לא רוצים הצפה), אבל הופך "כמה פעמים זה קרה החודש" לבלתי
// ניתן לחישוב ממנה. הטבלה הזו קיימת בדיוק בשביל זה - שורה אחת לכל webhook,
// בלי מיזוג בכלל, כדי שמגמה חודשית אמיתית תהיה אפשרית. לא יורשת מ-
// AuditableEntity בכוונה (כמו FailedIncidentIngestion) - רשומת תפעול
// חוצת-לקוחות, לא נתון עסקי מבודד-לקוח; הגישה מוגבלת ברמת ה-Controller
[Table("AzureAlertOccurrences")]
public class AzureAlertOccurrence
{
    public long Id { get; set; }

    [Required]
    [MaxLength(64)]
    public string TenantId { get; set; } = string.Empty;

    // שם ה-Alert Rule (למשל "backend-cpu-high-alert") או "ServiceHealth"/
    // "ResourceHealth" - מחושב ב-AzureAlertsController מתוך data.essentials
    [Required]
    [MaxLength(200)]
    public string AlertType { get; set; } = string.Empty;

    public DateTime FiredAt { get; set; } = DateTime.UtcNow;
}
