namespace MyBackendApi.Exceptions;

public sealed class AzureServiceHealthQueryFailedException(Exception innerException)
    : Exception("שאילתת Azure Service Health נכשלה - כנראה בעיית הרשאות/credential, לא היעדר אירועים בפועל", innerException);
