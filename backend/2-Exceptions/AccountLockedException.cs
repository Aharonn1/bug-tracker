namespace MyBackendApi.Exceptions;

public sealed class AccountLockedException(TimeSpan remaining)
    : Exception($"החשבון ננעל זמנית עקב ניסיונות התחברות כושלים חוזרים. נסה שוב בעוד כ-{Math.Ceiling(remaining.TotalMinutes)} דקות.");
