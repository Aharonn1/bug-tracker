namespace MyBackendApi.Services.Auth;

public interface ICurrentUserProvider
{
    int? UserId { get; }
    bool IsAdmin { get; }
    bool IsSiteAdmin { get; }

    // IsAdmin || IsSiteAdmin - משמש בכל מקום שצריך "לראות הכל" (לא מוגבל
    // לדיווחים של המשתמש עצמו), בלי שכל קריאה תצטרך לחבר את שני הדגלים בעצמה
    bool IsAdminOrAbove { get; }
}
