using System.ComponentModel.DataAnnotations;

namespace MyBackendApi.Models.DTOs.Auth;

public record RegisterRequestDto(
    [Required] string FullName,
    [Required][EmailAddress] string Email,
    [Required][MinLength(8)] string Password
);
