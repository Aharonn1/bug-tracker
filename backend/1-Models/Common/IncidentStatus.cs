namespace MyBackendApi.Models.Common;

public enum IncidentStatus : byte
{
    New = 1,
    UnderInvestigation = 2,
    RootCauseIdentified = 3,
    RemediationPendingApproval = 4,
    Remediated = 5,
    Closed = 6
}