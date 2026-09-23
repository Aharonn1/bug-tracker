using System.ComponentModel.DataAnnotations;

namespace MyBackendApi.Models.DTOs.Ingestion;

public record CreateIncidentDto(
    [Required] string TenantId,
    [Required] string ErrorCode,
    string? CaseNumber,
    string? ExternalReferenceId,
    string? ClientStationId,
    string? UserId,
    [Required] string ErrorMessage,
    string? StackTrace,
    string? RawPayload,
    string? ErrorFingerprintHash
);