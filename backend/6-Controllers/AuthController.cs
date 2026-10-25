using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using MyBackendApi.Models.DTOs.Auth;
using MyBackendApi.Services.Interfaces;

namespace MyBackendApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[AllowAnonymous]
[EnableRateLimiting("auth")]
public class AuthController(IAuthService authService) : ControllerBase
{
    [HttpPost("login")]
    [ProducesResponseType(typeof(AuthResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<AuthResponseDto>> Login(
        [FromBody] LoginRequestDto dto,
        CancellationToken ct)
    {
        var result = await authService.LoginAsync(dto, ct);
        return Ok(result);
    }

    [HttpPost("register")]
    [ProducesResponseType(typeof(AuthResponseDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<AuthResponseDto>> Register(
        [FromBody] RegisterRequestDto dto,
        CancellationToken ct)
    {
        var result = await authService.RegisterAsync(dto, ct);
        return StatusCode(StatusCodes.Status201Created, result);
    }

    // תמיד 204 - בין אם האימייל קיים ובין אם לא (ראו ForgotPasswordAsync) -
    // כדי לא לחשוף לקוח (או תוקף) אילו כתובות רשומות במערכת
    [HttpPost("forgot-password")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> ForgotPassword(
        [FromBody] ForgotPasswordRequestDto dto,
        CancellationToken ct)
    {
        await authService.ForgotPasswordAsync(dto, ct);
        return NoContent();
    }

    [HttpPost("reset-password")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ResetPassword(
        [FromBody] ResetPasswordRequestDto dto,
        CancellationToken ct)
    {
        await authService.ResetPasswordAsync(dto, ct);
        return NoContent();
    }
}
