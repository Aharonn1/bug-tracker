using MyBackendApi.Models.DTOs.Auth;

namespace MyBackendApi.Services.Interfaces;

public interface IAuthService
{
    Task<AuthResponseDto> LoginAsync(LoginRequestDto dto, CancellationToken ct = default);
    Task<AuthResponseDto> RegisterAsync(RegisterRequestDto dto, CancellationToken ct = default);
    Task ChangePasswordAsync(int userId, ChangePasswordRequestDto dto, CancellationToken ct = default);
}
