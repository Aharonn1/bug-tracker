namespace MyBackendApi.Exceptions;

public sealed class BugNotFoundException(int id) 
    : BaseNotFoundException($"Bug report with ID {id} was not found.");

public sealed class IncidentNotFoundException(long id) 
    : BaseNotFoundException($"Incident with ID {id} was not found.");