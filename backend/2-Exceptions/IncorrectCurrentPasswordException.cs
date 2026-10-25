namespace MyBackendApi.Exceptions;

public sealed class IncorrectCurrentPasswordException()
    : Exception("הסיסמה הנוכחית שגויה");
