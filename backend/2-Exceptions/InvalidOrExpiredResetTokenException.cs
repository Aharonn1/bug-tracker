namespace MyBackendApi.Exceptions;

public sealed class InvalidOrExpiredResetTokenException()
    : Exception("קישור איפוס הסיסמה אינו תקין או שפג תוקפו - בקש קישור חדש");
