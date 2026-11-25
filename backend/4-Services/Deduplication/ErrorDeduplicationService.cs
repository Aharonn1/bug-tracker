using System.Security.Cryptography;
using System.Text;

namespace MyBackendApi.Services.Deduplication;

public class ErrorDeduplicationService
{
    // CLIENT_HANDLED_API_FAILURE (fetch() שנכשל ברשת, "מטופל בעדינות" בצד הלקוח)
    // מקורו בקריאות fetch נפרדות בכל קובץ API (אין HttpClient משותף) - ה-stack
    // trace שלו הוא רק נקודת-הקריאה בקוד (קובץ/שורה), לא מידע אבחוני אמיתי על
    // התקלה עצמה. כלילתו בטביעת-האצבע הפכה כל endpoint שנכשל לתקרית נפרדת,
    // במקום לרכז את כל כשלי-הרשת הכלליים לכפילות אחת עם מונה עולה
    private const string ClientHandledApiFailureCode = "CLIENT_HANDLED_API_FAILURE";

    /// <summary>
    /// מחשב חתימת SHA-256 ייחודית לפי קוד השגיאה, ההודעה ותחילת ה-Stack Trace
    /// </summary>
    public string GenerateFingerprint(string errorCode, string errorMessage, string? stackTrace)
    {
        var rawString = errorCode == ClientHandledApiFailureCode
            ? $"{errorCode}:{errorMessage}"
            : $"{errorCode}:{errorMessage}:{stackTrace?[..Math.Min(stackTrace.Length, 150)]}";
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(rawString));
        return Convert.ToHexString(bytes);
    }
}