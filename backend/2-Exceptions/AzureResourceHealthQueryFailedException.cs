namespace MyBackendApi.Exceptions;

public sealed class AzureResourceHealthQueryFailedException(string resourceId, Exception innerException)
    : Exception($"שאילתת Azure Resource Health נכשלה עבור {resourceId} - כנראה בעיית הרשאות/credential, לא היעדר נתונים בפועל", innerException);
