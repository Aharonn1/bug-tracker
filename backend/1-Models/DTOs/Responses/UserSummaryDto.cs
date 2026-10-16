using MyBackendApi.Models.Common;

namespace MyBackendApi.Models.DTOs.Responses;

public record UserSummaryDto(
    int Id,
    string FullName,
    string Email,
    UserRole Role,
    string TenantId
);
