namespace MyBackendApi.Services.Interfaces;

public interface IRcaAgentService
{
    Task<string> AnalyzeAndRemediateIncidentAsync(
        string errorCode,
        string errorMessage,
        string category,
        string subsystem,
        string hebrewDescription,
        string? caseNumber,
        string? playbook,
        string? stackTrace,
        string? codeLocationFilePath,
        int? codeLocationLine,
        string codeLocationRef,
        string? activeAzureServiceHealthSummary,
        string? deployContextSummary,
        CancellationToken ct = default);
}