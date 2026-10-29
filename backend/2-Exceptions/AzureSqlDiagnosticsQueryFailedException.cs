namespace MyBackendApi.Exceptions;

public sealed class AzureSqlDiagnosticsQueryFailedException(Exception innerException)
    : Exception("שאילתת Log Analytics לאבחוני SQL נכשלה - כנראה בעיית הרשאות/credential, או שה-Diagnostic Setting עדיין לא הופעל", innerException);
