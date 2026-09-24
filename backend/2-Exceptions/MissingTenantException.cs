namespace MyBackendApi.Exceptions;

public class MissingTenantException(string message) : Exception(message);
