namespace MyBackendApi.Exceptions;

public sealed class IpBlockedException(TimeSpan remaining)
    : Exception($"כתובת ה-IP שלך נחסמה זמנית עקב ניסיונות התחברות חוזרים וחשודים. נסה שוב בעוד כ-{Math.Ceiling(remaining.TotalHours)} שעות.");
