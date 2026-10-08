using System.ComponentModel.DataAnnotations;
using MyBackendApi.Models.Common;

namespace MyBackendApi.Models.Entities;

public class User : AuditableEntity
{
    [Key]
    public int Id { get; set; }

    [Required]
    [MaxLength(120)]
    public string FullName { get; set; } = string.Empty;

    [Required]
    [MaxLength(256)]
    public string Email { get; set; } = string.Empty;

    [Required]
    public string PasswordHash { get; set; } = string.Empty;

    public UserRole Role { get; set; } = UserRole.User;

    public bool IsActive { get; set; } = true;

    // הגנת account lockout - עצמאית לגמרי מה-rate limiter הגלובלי (שהוא לפי
    // IP). תוקף נחוש יכול לעקוף הגבלה לפי-IP בקלות (הרבה כתובות/פרוקסי), אבל
    // לא יכול לעקוף הגבלה שעוקבת אחרי *החשבון* עצמו, לא מאיפה הבקשה הגיעה
    public int FailedLoginAttempts { get; set; }
    public DateTime? LockedOutUntil { get; set; }
}
