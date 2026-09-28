using MyBackendApi.Models.Common;

namespace MyBackendApi.Models.DTOs.Auth;

public record UserResponseDto(
    int Id,
    string FullName,
    string Email,
    UserRole Role
);

public record AuthResponseDto(
    string Token,
    DateTime ExpiresAt,
    UserResponseDto User
);
