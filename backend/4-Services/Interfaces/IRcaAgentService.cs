namespace MyBackendApi.Services.Interfaces;

public interface IRcaAgentService
{
    Task<string> AnalyzeAndRemediateIncidentAsync(
        string errorCode, 
        string errorMessage, 
        string? caseNumber, 
        string? stackTrace, 
        CancellationToken ct = default);
}