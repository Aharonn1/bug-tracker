using System.ComponentModel.DataAnnotations;

namespace MyBackendApi.Models.DTOs.Auth;

// אורך מינימלי של 12 ולא כללי מורכבות (אותיות גדולות/סימנים) - בהתאם
// להמלצת NIST SP 800-63B העדכנית: אורך הוא גורם החוזק המשמעותי ביותר,
// וכללי מורכבות נוקשים בפועל מניעים משתמשים לדפוסים צפויים ("Password1!")
// שלא תורמים הרבה לחוזק האמיתי מול brute-force
public record RegisterRequestDto(
    [Required] string FullName,
    [Required][EmailAddress] string Email,
    [Required][MinLength(12)] string Password
);
