namespace MyBackendApi.Exceptions;

public abstract class BaseNotFoundException(string message) : Exception(message);