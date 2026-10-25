using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Http;
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

public class AuthService(
    AppDbContext context,
    IConfiguration configuration,
    DbOutageLog dbOutageLog,
    IHttpContextAccessor httpContextAccessor) : IAuthService
{
    // PasswordHasher הוא stateless ובטוח לשימוש חוזר - חלק מ-Microsoft.AspNetCore.Identity
    // (מגיע דרך ה-Shared Framework של Microsoft.NET.Sdk.Web, בלי צורך בחבילה נפרדת)
    private static readonly PasswordHasher<User> Hasher = new();

    // ברירות מחדל: 5 ניסיונות כושלים נועלים את החשבון ל-15 דקות. זו הגנה
    // עצמאית לגמרי מה-rate limiter הגלובלי (שפועל לפי IP, ראו Program.cs) -
    // תוקף עם הרבה כתובות IP/פרוקסי יכול לעקוף הגבלה לפי-IP בקלות יחסית,
    // אבל לא יכול לעקוף הגבלה שעוקבת אחרי *החשבון* עצמו
    private int MaxFailedLoginAttempts => configuration.GetValue<int?>("Auth:MaxFailedLoginAttempts") ?? 5;
    private TimeSpan LockoutDuration => TimeSpan.FromMinutes(configuration.GetValue<int?>("Auth:LockoutDurationMinutes") ?? 15);

    // חסימת IP - שכבה שלישית, עצמאית גם מה-rate limiter (שמתאפס כל דקה) וגם
    // מנעילת החשבון הבודד (שלא "רואה" שאותו IP בדיוק מנסה על כמה חשבונות
    // שונים). מופעלת רק כש-IP אחד גורם לנעילת כמה חשבונות *שונים* תוך חלון
    // זמן - חתימה קלאסית של credential-stuffing, לא טעות הקלדה של משתמש בודד
    private int IpBanDistinctAccountsThreshold => configuration.GetValue<int?>("Auth:IpBanDistinctAccountsThreshold") ?? 3;
    private int IpBanWindowHours => configuration.GetValue<int?>("Auth:IpBanWindowHours") ?? 24;
    private int IpBanDurationHours => configuration.GetValue<int?>("Auth:IpBanDurationHours") ?? 24;

    // X-Client-IP, לא RemoteIpAddress/X-Forwarded-For הניתנים לזיוף - ראו
    // TrustedClientIp.cs להסבר המלא
    private string ClientIp => httpContextAccessor.HttpContext is { } ctx ? TrustedClientIp.Resolve(ctx) : "unknown";

    private string? CurrentTenantIdOrNull()
    {
        try { return context.CurrentTenantId; }
        catch { return null; }
    }

    private async Task LogAttemptAsync(string email, LoginAttemptOutcome outcome, CancellationToken ct)
    {
        context.LoginAttempts.Add(new LoginAttempt
        {
            Email = email,
            IpAddress = ClientIp,
            TenantId = CurrentTenantIdOrNull(),
            Outcome = outcome
        });
        await context.SaveChangesAsync(ct);
    }

    private async Task EnsureIpNotBlockedAsync(CancellationToken ct)
    {
        var ip = ClientIp;
        var block = await context.BlockedIpAddresses.FirstOrDefaultAsync(b => b.IpAddress == ip, ct);
        if (block is not null && block.BlockedUntil > DateTime.UtcNow)
        {
            await LogAttemptAsync("", LoginAttemptOutcome.IpBlocked, ct);
            throw new IpBlockedException(block.BlockedUntil - DateTime.UtcNow);
        }
    }

    // נקראת רק כשנוצרת נעילת-חשבון *חדשה* - לא על כל ניסיון חוזר נגד חשבון
    // שכבר נעול, כדי לא לבדוק את אותו דבר שוב ושוב לחינם
    private async Task CheckAndEscalateIpBanAsync(CancellationToken ct)
    {
        var ip = ClientIp;
        var since = DateTime.UtcNow.AddHours(-IpBanWindowHours);

        var distinctLockedAccounts = await context.LoginAttempts
            .Where(a => a.IpAddress == ip && a.Outcome == LoginAttemptOutcome.AccountLocked && a.AttemptedAt > since)
            .Select(a => a.Email)
            .Distinct()
            .CountAsync(ct);

        if (distinctLockedAccounts < IpBanDistinctAccountsThreshold) return;

        var existing = await context.BlockedIpAddresses.FirstOrDefaultAsync(b => b.IpAddress == ip, ct);
        var blockedUntil = DateTime.UtcNow.AddHours(IpBanDurationHours);
        var reason = $"נעל {distinctLockedAccounts} חשבונות שונים תוך {IpBanWindowHours} שעות";

        if (existing is null)
        {
            context.BlockedIpAddresses.Add(new BlockedIpAddress
            {
                IpAddress = ip,
                BlockedUntil = blockedUntil,
                Reason = reason
            });
        }
        else
        {
            existing.BlockedUntil = blockedUntil;
            existing.Reason = reason;
            existing.UpdatedAt = DateTime.UtcNow;
        }

        await context.SaveChangesAsync(ct);
    }

    public async Task<AuthResponseDto> LoginAsync(LoginRequestDto dto, CancellationToken ct = default)
    {
        // נבדק *לפני* כל גישה לטבלת המשתמשים - IP חסום לא אמור לגרום לשום
        // שאילתה נוספת, אותו עיקרון בדיוק כמו "אותה שגיאה למשתמש לא קיים"
        await EnsureIpNotBlockedAsync(ct);

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

        if (user is null)
        {
            await LogAttemptAsync(dto.Email, LoginAttemptOutcome.UnknownEmail, ct);
            throw new InvalidCredentialsException();
        }

        // בדיקת נעילה *לפני* אימות הסיסמה - אין טעם לבדוק סיסמה על חשבון
        // שכבר נעול, וזה גם מונע "ניחוש" נוסף על חשבון נעול
        if (user.LockedOutUntil is { } lockedUntil && lockedUntil > DateTime.UtcNow)
        {
            await LogAttemptAsync(dto.Email, LoginAttemptOutcome.AccountLocked, ct);
            throw new AccountLockedException(lockedUntil - DateTime.UtcNow);
        }

        // אותה שגיאה בדיוק בין "משתמש לא קיים" ל"סיסמה שגויה" בכוונה - כדי לא
        // לחשוף לתוקף פוטנציאלי אילו כתובות אימייל בכלל רשומות במערכת
        if (Hasher.VerifyHashedPassword(user, user.PasswordHash, dto.Password) == PasswordVerificationResult.Failed)
        {
            user.FailedLoginAttempts++;
            if (user.FailedLoginAttempts >= MaxFailedLoginAttempts)
            {
                user.LockedOutUntil = DateTime.UtcNow.Add(LockoutDuration);
                user.FailedLoginAttempts = 0;
                await context.SaveChangesAsync(ct);

                await LogAttemptAsync(dto.Email, LoginAttemptOutcome.AccountLocked, ct);
                await CheckAndEscalateIpBanAsync(ct);

                throw new AccountLockedException(LockoutDuration);
            }
            await context.SaveChangesAsync(ct);

            await LogAttemptAsync(dto.Email, LoginAttemptOutcome.InvalidCredentials, ct);
            throw new InvalidCredentialsException();
        }

        // התחברות מוצלחת - מאפסים כל מונה כשלים/נעילה קודמים מה-IP/זמן הזה
        if (user.FailedLoginAttempts != 0 || user.LockedOutUntil is not null)
        {
            user.FailedLoginAttempts = 0;
            user.LockedOutUntil = null;
            await context.SaveChangesAsync(ct);
        }

        await LogAttemptAsync(dto.Email, LoginAttemptOutcome.Success, ct);
        return BuildAuthResponse(user);
    }

    public async Task<AuthResponseDto> RegisterAsync(RegisterRequestDto dto, CancellationToken ct = default)
    {
        await EnsureIpNotBlockedAsync(ct);

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
        // CurrentTenantId נגזר מה-header/JWT בלבד (לא דורש DB) - בטוח לקרוא לו
        // גם כאן, כש-ה-DB עצמו נפל. בלי tenant לשייך אליו, DbOutageFlushWorker
        // לא יוכל לפרוק את הרשומה הזו נכון מאוחר יותר - אם אין header בכלל
        // (קריאה אנונימית לגמרי בלי X-Tenant-Id), פשוט מדלגים על התיעוד
        string tenantId;
        try
        {
            tenantId = context.CurrentTenantId;
        }
        catch
        {
            return;
        }

        dbOutageLog.Record(new DbOutageEntry(
            OccurredAt: DateTime.UtcNow,
            ExceptionType: ex.GetType().Name,
            Message: ex.Message,
            RequestPath: action,
            TenantId: tenantId,
            AttemptedEmail: email
        ));
    }

    // "שכחתי סיסמה" (איפוס עצמאי בלי להיות מחובר) דורש שירות שליחת מיילים -
    // אין כזה היום במערכת, אז זה נשאר רק לשינוי-סיסמה עצמי של משתמש שכבר
    // מחובר. אין צורך בבדיקת נעילה/IP כאן - המשתמש כבר עבר אימות JWT תקף
    // כדי להגיע לכאן בכלל
    public async Task ChangePasswordAsync(int userId, ChangePasswordRequestDto dto, CancellationToken ct = default)
    {
        var user = await context.Users.FirstOrDefaultAsync(u => u.Id == userId, ct)
            ?? throw new InvalidOperationException("משתמש מאומת לא נמצא");

        if (Hasher.VerifyHashedPassword(user, user.PasswordHash, dto.CurrentPassword) == PasswordVerificationResult.Failed)
        {
            throw new IncorrectCurrentPasswordException();
        }

        user.PasswordHash = Hasher.HashPassword(user, dto.NewPassword);
        await context.SaveChangesAsync(ct);
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
