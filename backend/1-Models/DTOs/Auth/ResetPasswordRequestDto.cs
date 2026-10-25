using System.ComponentModel.DataAnnotations;

namespace MyBackendApi.Models.DTOs.Auth;

// אותה מדיניות אורך כמו RegisterRequestDto/ChangePasswordRequestDto (12
// תווים, בלי כללי מורכבות) - ראו שם להסבר המלא (NIST SP 800-63B)
public record ResetPasswordRequestDto(
    [Required] string Token,
    [Required][MinLength(12)] string NewPassword
);
