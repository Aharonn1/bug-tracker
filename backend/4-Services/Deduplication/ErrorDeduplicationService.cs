using System.Security.Cryptography;
using System.Text;

namespace MyBackendApi.Services.Deduplication;

public class ErrorDeduplicationService
{
    /// <summary>
    /// מחשב חתימת SHA-256 ייחודית לפי קוד השגיאה, ההודעה ותחילת ה-Stack Trace
    /// </summary>
    public string GenerateFingerprint(string errorCode, string errorMessage, string? stackTrace)
    {
        var rawString = $"{errorCode}:{errorMessage}:{stackTrace?[..Math.Min(stackTrace.Length, 150)]}";
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(rawString));
        return Convert.ToHexString(bytes);
    }
}