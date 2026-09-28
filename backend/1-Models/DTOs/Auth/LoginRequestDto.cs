using System.ComponentModel.DataAnnotations;

namespace MyBackendApi.Models.DTOs.Auth;

public record LoginRequestDto(
    [Required] string Email,
    [Required] string Password
);
