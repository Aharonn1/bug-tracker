using System.ComponentModel.DataAnnotations;

namespace MyBackendApi.Models.DTOs.Auth;

// אותה מדיניות אורך כמו RegisterRequestDto (12 תווים, בלי כללי מורכבות) -
// ראו שם להסבר המלא (NIST SP 800-63B)
public record ChangePasswordRequestDto(
    [Required] string CurrentPassword,
    [Required][MinLength(12)] string NewPassword
);
