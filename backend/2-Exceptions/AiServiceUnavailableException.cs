namespace MyBackendApi.Exceptions;

public class AiServiceUnavailableException(string message) : Exception(message);
