using System.Text;
using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.ResponseCompression;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using MyBackendApi.Data;
using MyBackendApi.Middleware;
using MyBackendApi.Services.Agent;
using MyBackendApi.Services.Auth;
using MyBackendApi.Services.Core;
using MyBackendApi.Services.Deduplication;
using MyBackendApi.Services.Diagnostics;
using MyBackendApi.Services.Interfaces;
using MyBackendApi.Services.Notifications;
using MyBackendApi.Services.Plugins;
using MyBackendApi.Services.Queues;
using MyBackendApi.Services.Tenancy;

var builder = WebApplication.CreateBuilder(args);

// ==========================================
// 0. Forwarded Headers - עדיין נדרש בשביל XForwardedProto (זיהוי HTTPS
// מאחורי ה-proxy הפנימי של Azure App Service). X-Forwarded-For *לא* משמש
// יותר כמקור אמון לשום החלטת אבטחה (Rate Limiting, חסימת IP) - הוא כותרת
// רגילה שכל לקוח חיצוני יכול לשלוח בעצמו, ואומת אמפירית שזה מאפשר לעקוף
// גם הגבלת-קצב וגם חסימת IP (אותה בקשה בדיוק, עם X-Forwarded-For שונה,
// עברה חסימה פעילה). ל-IP אמיתי ובלתי-ניתן-לזיוף משתמשים ב-X-Client-IP
// (ראו TrustedClientIp.cs) - כותרת שה-Front End Role של Azure App Service
// עצמו קובע ברמת הפלטפורמה ותמיד דורס, בניגוד ל-X-Forwarded-For
// ==========================================
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.KnownNetworks.Clear();
    options.KnownProxies.Clear();
});

// ==========================================
// 0.5 Rate Limiting - שני סוגי הגנה שונים, לא רק אחד:
//
// 1) לפי-IP (SlidingWindow) - מונע מגורם בודד להציף את המערכת. לא עוזר
//    נגד עומס אמיתי ומבוזר (למשל 100 משרדים שונים, כל אחד עם כמה בקשות
//    בודדות בדקה - אף אחד מהם לא חוצה את הסף, אבל ביחד הם כן מציפים את
//    ה-App Service שרץ כרגע על ליבת CPU בודדת).
//
// 2) Concurrency גלובלי (לא מפוצל, חל על כל הבקשות ביחד) - זה מה שבאמת
//    עונה על "עומס אמיתי": מגביל כמה בקשות מטופלות *בו-זמנית* בפועל, לא
//    משנה מאיזה IP. מעבר לתקרה, בקשות ממתינות בתור קצר (QueueLimit) ואז
//    נדחות עם 503 מיידי - "אני עמוס, נסה שוב" - במקום להיתקע 6-13 שניות
//    ואז להיכשל ממילא כמו שראינו בבדיקות העומס. RateLimiting:GlobalConcurrency
//    ב-config כדי שאפשר יהיה להעלות את זה מאוחר יותר בלי שינוי קוד, כש-
//    ה-App Service ישודרג מ-Basic B1 (ליבה אחת) ל-tier עם יותר קיבולת
// ==========================================
var globalConcurrencyLimit = builder.Configuration.GetValue<int?>("RateLimiting:GlobalConcurrency") ?? 60;

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    static string ClientKey(HttpContext ctx) => TrustedClientIp.Resolve(ctx);

    var perIpLimiter = PartitionedRateLimiter.Create<HttpContext, string>(ctx =>
        RateLimitPartition.GetSlidingWindowLimiter(ClientKey(ctx), _ => new SlidingWindowRateLimiterOptions
        {
            PermitLimit = 300,
            Window = TimeSpan.FromMinutes(1),
            SegmentsPerWindow = 4,
            QueueLimit = 0,
        }));

    var concurrencyLimiter = PartitionedRateLimiter.Create<HttpContext, string>(_ =>
        RateLimitPartition.GetConcurrencyLimiter("global", _ => new ConcurrencyLimiterOptions
        {
            PermitLimit = globalConcurrencyLimit,
            QueueLimit = 20,
            QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
        }));

    // שניהם חייבים לאשר - הבקשה נדחית אם היא עוברת את אחד הספים, לא רק את שניהם ביחד
    options.GlobalLimiter = PartitionedRateLimiter.CreateChained(perIpLimiter, concurrencyLimiter);

    // מחמירה יותר - login/register (הגנת brute-force על סיסמאות)
    options.AddPolicy("auth", ctx =>
        RateLimitPartition.GetSlidingWindowLimiter(ClientKey(ctx), _ => new SlidingWindowRateLimiterOptions
        {
            PermitLimit = 10,
            Window = TimeSpan.FromMinutes(1),
            SegmentsPerWindow = 2,
            QueueLimit = 0,
        }));

    // ingest אנונימי - פתוח בלי אימות בכוונה (ראו הערה ב-IncidentsController),
    // אז זה בדיוק ה-endpoint שהכי צריך תקרה משלו
    options.AddPolicy("ingest", ctx =>
        RateLimitPartition.GetSlidingWindowLimiter(ClientKey(ctx), _ => new SlidingWindowRateLimiterOptions
        {
            PermitLimit = 30,
            Window = TimeSpan.FromMinutes(1),
            SegmentsPerWindow = 2,
            QueueLimit = 0,
        }));
});

// ==========================================
// 1. הגדרת CORS - מוגבל לרשימת origins מפורשת (Cors:AllowedOrigins ב-App
// Settings), לא AllowAnyOrigin גורף. origin פתוח לגמרי מאפשר לכל אתר באינטרנט
// לשלוח בקשות XHR/fetch ל-API הזה (עם קרדנציאלס שהם עצמם מחזיקים, לא שלנו -
// אין פה cookies אז זה לא CSRF קלאסי, אבל זו עדיין פרצה מיותרת ללא שום תועלת
// עבור API שמשרת origin יחיד ידוע). אם לא מוגדר (למשל בפיתוח מקומי לפני
// שהוגדר), נופלים חזרה ל-AllowAnyOrigin כדי לא לנעול בטעות - בפרודקשן זה
// חייב להיות מוגדר
// ==========================================
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp", policy =>
    {
        if (allowedOrigins.Length > 0)
        {
            policy.WithOrigins(allowedOrigins)
                  .AllowAnyMethod()
                  .AllowAnyHeader();
        }
        else
        {
            policy.AllowAnyOrigin()
                  .AllowAnyMethod()
                  .AllowAnyHeader();
        }
    });
});

// ==========================================
// 1.5 Response Compression - משתלם במיוחד ללקוחות על רשת חלשה/סלולרית
// (בדיוק המשתמשים שדיווחו על איטיות): JSON דחוס במקום גולמי. EnableForHttps
// מופעל בכוונה למרות שברירת המחדל כבויה (היסטורית, הגנה מפני BREACH) -
// כאן זה בטוח כי אין בתגובות סוד (כמו CSRF token) שמוחזר יחד עם קלט
// שמוזן ע"י התוקף - אימות כאן הוא Bearer JWT, לא cookie+CSRF-in-body
// ==========================================
builder.Services.AddResponseCompression(options =>
{
    options.EnableForHttps = true;
    options.Providers.Add<BrotliCompressionProvider>();
    options.Providers.Add<GzipCompressionProvider>();
});

// ==========================================
// 2. קונטרולרים וטיפול בשגיאות Enterprise (RFC 7807)
// ==========================================
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
        // שדות null לא נכתבים בכלל במקום "fieldName":null מפורש - חוסך בייטים
        // בכל תגובה, בולט במיוחד ב-DTOs עם הרבה שדות nullable (כמו תקריות).
        // בטוח: קוד הלקוח כבר בודק falsy (!value), לא === null במפורש, על
        // כל השדות הרלוונטיים שחוזרים מה-API (אומת לפני השינוי)
        options.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
    });

builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
builder.Services.AddProblemDetails();

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// AddApplicationInsightsTelemetry() קורס (exit code 134) על Azure App Service Linux
// כשאין connection string מוגדר - מאומת ישירות מול הפלטפורמה. מפעילים רק כשיש בפועל
// מה להתחבר אליו (מקומית - דרך User Secrets; ב-Azure - כשיוגדר Application Setting)
if (!string.IsNullOrEmpty(builder.Configuration["ApplicationInsights:ConnectionString"]))
{
    builder.Services.AddApplicationInsightsTelemetry();
}

// ==========================================
// 3. מסד נתונים - Entity Framework Core
// ==========================================

// Max Pool Size מוגדר כאן בקוד, לא תלוי במה שמוגדר (או לא מוגדר) ב-connection
// string השמור ב-Key Vault - כך שגם כשיום אחד נשדרג את ה-SQL tier כדי להחזיק
// יותר עומס, אף אחד לא יצטרך לזכור לערוך את הסוד כדי להרים גם את התקרה בצד
// הלקוח (ADO.NET מגביל ל-100 כברירת מחדל, מספיק קטן שהוא עלול להיות הצוואר
// בקבוק הבא אחרי שה-DB כבר לא)
var connectionStringBuilder = new Microsoft.Data.SqlClient.SqlConnectionStringBuilder(
    builder.Configuration.GetConnectionString("DefaultConnection"))
{
    MaxPoolSize = 200,
};

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(
        connectionStringBuilder.ConnectionString,
        sqlOptions => sqlOptions.EnableRetryOnFailure(
            maxRetryCount: 5,
            maxRetryDelay: TimeSpan.FromSeconds(30),
            errorNumbersToAdd: null)));

// בדיקת בריאות שכוללת גם חיבור בפועל ל-DB - Azure App Service (feature חינמי בכל
// ה-tiers) יכול לבדוק נתיב זה תדיר ולהחליף אוטומטית instance תקוע, בלי שנצטרך
// לגלות ידנית שקרה crash loop כמו שקרה לנו היום
builder.Services.AddHealthChecks()
    .AddDbContextCheck<AppDbContext>();

// ==========================================
// 4. שכבת שירותי הליבה (Core Services & Interfaces)
// ==========================================
builder.Services.AddScoped<IBugService, BugService>();
builder.Services.AddScoped<IIncidentService, IncidentService>();
builder.Services.AddScoped<IIncidentNotificationService, IncidentNotificationService>();
builder.Services.AddScoped<IUserDirectoryService, UserDirectoryService>();
builder.Services.AddScoped<IFailedIncidentService, FailedIncidentService>();
builder.Services.AddScoped<ILoginSecurityService, LoginSecurityService>();
builder.Services.AddScoped<TelemetryAnalysisService>();
builder.Services.AddSingleton<OpsInsightsService>();
builder.Services.AddSingleton<AzureResourceMetricsReader>();
builder.Services.AddSingleton<AzureSqlMetricsService>();
builder.Services.AddSingleton<AzureAppServiceMetricsService>();
builder.Services.AddSingleton<AzureServiceHealthReader>();

// זיהוי הלקוח (Tenant) הנוכחי מתוך ה-header של הבקשה - נדרש עבור ה-Global Query
// Filter ב-AppDbContext שמבדיל בין לקוחות שונים
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentTenantProvider, HttpContextTenantProvider>();

// ==========================================
// 4.5. הזדהות משתמשים - JWT (לא Cookies, כי ה-frontend וה-backend רצים על
// שני דומיינים שונים: Static Web App מול App Service)
// ==========================================
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<ICurrentUserProvider, HttpContextCurrentUserProvider>();

var jwtSecretKey = builder.Configuration["Jwt:SecretKey"];
if (!string.IsNullOrEmpty(jwtSecretKey))
{
    builder.Services
        .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
        .AddJwtBearer(options =>
        {
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                ValidIssuer = builder.Configuration["Jwt:Issuer"] ?? "BugReportsApi",
                ValidAudience = builder.Configuration["Jwt:Audience"] ?? "BugReportsClient",
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecretKey))
            };
        });
}

// ==========================================
// 5. תשתית High-Throughput Ingestion & Deduplication
// ==========================================
builder.Services.AddSingleton<IncidentChannelQueue>();
builder.Services.AddSingleton<ErrorDeduplicationService>();
builder.Services.AddHostedService<IncidentIngestionWorker>();

// יומן זיכרון-בלבד לתקריות "אין גישה ל-DB" - ראו הערה ב-DbOutageLog.cs.
// חייב Singleton כדי לשרוד בין בקשות; ה-Worker מנסה "לפרוק" אותו ל-DB
// תקופתית ברגע שהחיבור חוזר
builder.Services.AddSingleton<DbOutageLog>();
builder.Services.AddHostedService<DbOutageFlushWorker>();

// סוריקה תקופתית על FailedIncidentIngestions (Dead-Letter) - ראו הערה
// ב-FailedIncidentRetryWorker.cs
builder.Services.AddHostedService<FailedIncidentRetryWorker>();

// ==========================================
// 6. שירותי סוכן AI וכלי חקירה - RcaAgentService פונה ל-Azure OpenAI ישירות
// דרך HTTP (לא דרך Semantic Kernel), ולכן אין כאן רישום Kernel. המעבר
// מ-OpenAI הציבורי ל-Azure OpenAI נעשה כדי שנתוני תקריות (כולל שמות מערכות
// ממשלתיות) לא יצאו מגבולות ה-tenant של Azure
// ==========================================
builder.Services.AddHttpClient();
builder.Services.AddScoped<DiagnosticPlugins>();
builder.Services.AddScoped<IRcaAgentService, RcaAgentService>();

// ==========================================
// 7. HSTS - תצורה מפורשת
// ==========================================
// בלי קונפיגורציה מפורשת, UseHsts() למטה משתמש ב-MaxAge ברירת המחדל של
// ASP.NET Core - 30 יום בלבד. זה מתחת לסף שדורג SSL Labs בשביל ציון A+
// (נדרש בסביבות 180 יום ומעלה) - נבדק בפועל: הבקאנד קיבל A, הפרונטנד
// (עם max-age=31536000, שנה אחת, בקובץ staticwebapp.config.json) קיבל A+.
// 365 יום כאן כדי להתאים לאותו ערך בדיוק משני הצדדים
builder.Services.AddHsts(options =>
{
    options.MaxAge = TimeSpan.FromDays(365);
    options.IncludeSubDomains = true;
});

var app = builder.Build();

// ==========================================
// 7. Request Pipeline Configuration
// ==========================================
app.UseExceptionHandler();

// ראשון בצינור בכוונה - כל middleware אחרי זה צריך לראות את ה-IP האמיתי של
// הלקוח, לא את זה של ה-proxy הפנימי של Azure
app.UseForwardedHeaders();

// HSTS - מורה לדפדפן לזכור "דבר עם השרת הזה רק ב-HTTPS" לטווח ארוך, כך
// שגם אם מישהו ינסה (בטעות או בזדון, למשל Wi-Fi ציבורי עוין) לשלוח אותו
// ל-HTTP, הדפדפן עצמו יסרב ולא ישלח את הבקשה כלל. לא ב-Development כי שם
// אין תעודת HTTPS תקפה מקומית
if (!app.Environment.IsDevelopment())
{
    app.UseHsts();
}

// מפנה כל בקשת HTTP ל-HTTPS - הגנה ברמת הקוד שלא תלויה בהגדרת "HTTPS Only"
// ב-Azure Portal (שגם היא כדאי שתהיה דלוקה, אבל לא לסמוך רק עליה)
app.UseHttpsRedirection();

// חייב לרוץ לפני כל middleware שכותב את גוף התגובה (MapControllers למטה) -
// זה מה שבאמת דוחס את ה-JSON היוצא
app.UseResponseCompression();

// כמה Security Headers בסיסיים וחינמיים - לא תלויים ב-tier או בשירות נוסף:
// X-Content-Type-Options מונע מהדפדפן "לנחש" Content-Type שונה ממה שהשרת
// הצהיר (שימש בעבר להברחת סקריפטים דרך קבצים שהוצהרו כ-text/plain וכו').
// X-Frame-Options מונע הטמעת ה-API/Swagger בתוך iframe באתר זר (clickjacking).
// Referrer-Policy מונע מה-URL המלא (כולל פרמטרים בשאילתה) לדלוף ל-origin
// חיצוני דרך כותרת ה-Referer בבקשות יוצאות.
// Permissions-Policy חוסם גישה לפיצ'רי דפדפן (מצלמה/מיקרופון/מיקום) - רלוונטי
// גם ל-API טהור, כי זה חוסם גם דפים חיצוניים שמטמיעים תגובה מה-API בצורה
// לא צפויה
app.Use(async (context, next) =>
{
    context.Response.Headers.Append("X-Content-Type-Options", "nosniff");
    context.Response.Headers.Append("X-Frame-Options", "DENY");
    context.Response.Headers.Append("Referrer-Policy", "no-referrer");
    context.Response.Headers.Append("Permissions-Policy", "geolocation=(), microphone=(), camera=()");

    // CSP רק מחוץ ל-Development: Swagger UI (זמין רק ב-Development, ראו למטה)
    // טוען סקריפטים וסגנונות מוטבעים משלו שהמדיניות הזו הייתה חוסמת.
    // ב-production זה API טהור (JSON בלבד) שלעולם לא אמור לרנדר כלום
    // בדפדפן - default-src 'none' חוסם הכול בלי לשבור שום פונקציונליות אמיתית
    if (!app.Environment.IsDevelopment())
    {
        context.Response.Headers.Append("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");
    }

    await next();
});

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowReactApp");

app.UseRateLimiter();

app.UseAuthentication();
app.UseAuthorization();

// GET/HEAD / ללא זה מחזיר 404 עם גוף ריק וללא Content-Type - מספיק חריג בשביל
// לגרום לכלי סריקה חיצוניים (כמו Mozilla HTTP Observatory) להיכשל לגמרי
// בניתוח במקום לתת ציון. זה endpoint מידע בלבד, לא קשור ל-API העסקי.
// MapGet לבדו רושם רק את הפועל GET - כלי סריקה ששולח HEAD כבדיקה מקדימה
// עדיין יקבל 405, לכן צריך לרשום את שני הפעלים במפורש
app.MapMethods("/", ["GET", "HEAD"], () => Results.Ok(new { service = "BugReports API", status = "ok" }));

app.MapHealthChecks("/health");
app.MapControllers();

app.Run();
