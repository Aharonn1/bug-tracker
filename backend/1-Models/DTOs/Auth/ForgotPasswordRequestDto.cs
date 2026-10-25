using System.ComponentModel.DataAnnotations;

namespace MyBackendApi.Models.DTOs.Auth;

public record ForgotPasswordRequestDto(
    [Required][EmailAddress] string Email
);
