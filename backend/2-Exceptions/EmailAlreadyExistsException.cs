namespace MyBackendApi.Exceptions;

public sealed class EmailAlreadyExistsException(string email)
    : Exception($"כתובת האימייל {email} כבר רשומה במערכת");
