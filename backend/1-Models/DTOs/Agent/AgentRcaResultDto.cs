using System.Text.Json.Serialization;

namespace MyBackendApi.Models.DTOs;

public class AgentRcaResultDto
{
    [JsonPropertyName("rootCauseCategory")]
    public string RootCauseCategory { get; set; } = null!;

    [JsonPropertyName("detailedDiagnosis")]
    public string DetailedDiagnosis { get; set; } = null!;

    [JsonPropertyName("confidenceScore")]
    public double ConfidenceScore { get; set; }

    [JsonPropertyName("canAutoRemediate")]
    public bool CanAutoRemediate { get; set; }

    [JsonPropertyName("recommendedAction")]
    public string RecommendedAction { get; set; } = null!;

    [JsonPropertyName("remediationToolToExecute")]
    public string? RemediationToolToExecute { get; set; }

    [JsonPropertyName("remediationPayload")]
    public Dictionary<string, string>? RemediationPayload { get; set; }

    [JsonPropertyName("executiveSummary")]
    public string ExecutiveSummary { get; set; } = null!;
}