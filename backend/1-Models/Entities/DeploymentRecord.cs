using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MyBackendApi.Models.Entities;

// נכתב ע"י GitHub Actions עצמו, צעד אחרון בכל workflow דיפלוי מוצלח (ראו
// backend-deploy.yml/frontend-deploy.yml) - לא נגזר מה-API של GitHub, כי
// "מתי זה פוש" שונה מ"מתי זה באמת היה חי בפרודקשן", וזה בדיוק מה שרלוונטי
// לתחקור תקרית: "האם דיפלוי קרה ממש לפני שהתקרית התחילה". משמש לשני
// דברים: (1) קישור מדויק ל-GitHub על הקומיט שהיה חי בפועל כשהתקרית קרתה,
// לא על main הנוכחי שאולי כבר השתנה, (2) איתות ל-RCA agent על קרבה בזמן
// לדיפלוי אחרון. לא יורש מ-AuditableEntity בכוונה - רשומת תפעול חוצת-לקוחות
[Table("DeploymentRecords")]
public class DeploymentRecord
{
    public long Id { get; set; }

    // "backend" | "frontend" - תואם בדיוק לקידומת הנתיב ב-CodeLocationFilePath
    [Required]
    [MaxLength(20)]
    public string Component { get; set; } = string.Empty;

    [Required]
    [MaxLength(40)]
    public string CommitSha { get; set; } = string.Empty;

    public DateTime DeployedAt { get; set; } = DateTime.UtcNow;
}
