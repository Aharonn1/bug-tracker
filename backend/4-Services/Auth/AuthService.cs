using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using MyBackendApi.Data;
using MyBackendApi.Exceptions;
using MyBackendApi.Models.Common;
using MyBackendApi.Models.DTOs.Auth;
using MyBackendApi.Models.Entities;
using MyBackendApi.Services.Diagnostics;
using MyBackendApi.Services.Interfaces;
using static MyBackendApi.Services.Diagnostics.DatabaseExceptionDetector;

namespace MyBackendApi.Services.Auth;

public class AuthService(AppDbContext context, IConfiguration configuration, DbOutageLog dbOutageLog) : IAuthService
{
    // PasswordHasher הוא stateless ובטוח לשימוש חוזר - חלק מ-Microsoft.AspNetCore.Identity
    // (מגיע דרך ה-Shared Framework של Microsoft.NET.Sdk.Web, בלי צורך בחבילה נפרדת)
    private static readonly PasswordHasher<User> Hasher = new();

    public async Task<AuthResponseDto> LoginAsync(LoginRequestDto dto, CancellationToken ct = default)
    {
        User? user;
        try
        {
            user = await context.Users
                .FirstOrDefaultAsync(u => u.Email == dto.Email && u.IsActive, ct);
        }
        catch (Exception ex) when (IsDatabaseConnectivityException(ex))
        {
            // כאן, ולא ב-GlobalExceptionHandler הגנרי, כי יש לנו את האימייל
            // שהוקלד - אחרת "אצל מי" הייתה נשארת "לא מזוהה" תמיד בכשל כזה
            RecordDbOutage(ex, "ניסיון התחברות", dto.Email);
            throw;
        }

        // אותה שגיאה בדיוק בין "משתמש לא קיים" ל"סיסמה שגויה" בכוונה - כדי לא
        // לחשוף לתוקף פוטנציאלי אילו כתובות אימייל בכלל רשומות במערכת
        if (user is null || Hasher.VerifyHashedPassword(user, user.PasswordHash, dto.Password) == PasswordVerificationResult.Failed)
        {
            throw new InvalidCredentialsException();
        }

        return BuildAuthResponse(user);
    }

    public async Task<AuthResponseDto> RegisterAsync(RegisterRequestDto dto, CancellationToken ct = default)
    {
        try
        {
            // בלי IgnoreQueryFilters בכוונה - הייחודיות של אימייל היא per-tenant,
            // אז הבדיקה חייבת להיות מוגבלת ללקוח הנוכחי (ה-Global Query Filter
            // הרגיל כבר עושה את זה). בדיקה גלובלית הייתה חוסמת הרשמה של אדם
            // במשרד אחד רק כי אותו אימייל כבר רשום במשרד אחר לגמרי
            var emailTaken = await context.Users.AnyAsync(u => u.Email == dto.Email, ct);
            if (emailTaken) throw new EmailAlreadyExistsException(dto.Email);

            var user = new User
            {
                FullName = dto.FullName,
                Email = dto.Email,
                Role = UserRole.User,
                TenantId = context.CurrentTenantId
            };
            user.PasswordHash = Hasher.HashPassword(user, dto.Password);

            context.Users.Add(user);

            try
            {
                await context.SaveChangesAsync(ct);
            }
            catch (DbUpdateException)
            {
                // חלון מירוץ נדיר: שתי הרשמות בו-זמנית עם אותו אימייל באותו
                // לקוח, שתיהן עברו את הבדיקה למעלה לפני שהראשונה נשמרה.
                // האינדקס הייחודי ב-DB תופס את זה - מתורגם להודעה ברורה
                // במקום 500 גנרי
                throw new EmailAlreadyExistsException(dto.Email);
            }

            return BuildAuthResponse(user);
        }
        catch (Exception ex) when (IsDatabaseConnectivityException(ex))
        {
            RecordDbOutage(ex, "ניסיון הרשמה", dto.Email);
            throw;
        }
    }

    private void RecordDbOutage(Exception ex, string action, string email)
    {
        dbOutageLog.Record(new DbOutageEntry(
            OccurredAt: DateTime.UtcNow,
            ExceptionType: ex.GetType().Name,
            Message: ex.Message,
            RequestPath: action,
            AttemptedEmail: email
        ));
    }

    private AuthResponseDto BuildAuthResponse(User user)
    {
        var secretKey = configuration["Jwt:SecretKey"]
            ?? throw new InvalidOperationException("חסר Jwt:SecretKey בהגדרות השרת");
        var issuer = configuration["Jwt:Issuer"] ?? "BugReportsApi";
        var audience = configuration["Jwt:Audience"] ?? "BugReportsClient";
        var expiryMinutes = int.TryParse(configuration["Jwt:ExpiryMinutes"], out var minutes) ? minutes : 480;
        var expiresAt = DateTime.UtcNow.AddMinutes(expiryMinutes);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(ClaimTypes.Name, user.FullName),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Role, user.Role.ToString()),
            new Claim("tenantId", user.TenantId)
        };

        var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));
        var credentials = new SigningCredentials(signingKey, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: expiresAt,
            signingCredentials: credentials);

        var tokenString = new JwtSecurityTokenHandler().WriteToken(token);

        return new AuthResponseDto(
            tokenString,
            expiresAt,
            new UserResponseDto(user.Id, user.FullName, user.Email, user.Role));
    }
}
