using System.Text;
using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.RateLimiting;
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
using MyBackendApi.Services.Plugins;
using MyBackendApi.Services.Queues;
using MyBackendApi.Services.Tenancy;

var builder = WebApplication.CreateBuilder(args);

// ==========================================
// 0. Forwarded Headers - Azure App Service רץ מאחורי reverse proxy פנימי.
// בלי זה, HttpContext.Connection.RemoteIpAddress מחזיר את ה-IP הפנימי של
// ה-proxy עבור כל בקשה (אותו IP לכולם) - מה שהופך כל Rate Limiting לפי IP
// (סעיף 0.5 למטה) לחסר משמעות, כי כל התעבורה הייתה נראית כמו "משתמש אחד".
// KnownProxies/KnownNetworks מנוקים בכוונה כי Azure App Service הוא ה-proxy
// היחיד שרץ לפנינו - בוטחים בו באופן גורף, לא ברשת IP ספציפית
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

    static string ClientKey(HttpContext ctx) => ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown";

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
// 2. קונטרולרים וטיפול בשגיאות Enterprise (RFC 7807)
// ==========================================
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
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
builder.Services.AddScoped<TelemetryAnalysisService>();
builder.Services.AddSingleton<OpsInsightsService>();
builder.Services.AddSingleton<AzureResourceMetricsReader>();
builder.Services.AddSingleton<AzureSqlMetricsService>();
builder.Services.AddSingleton<AzureAppServiceMetricsService>();

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

// ==========================================
// 6. שירותי סוכן AI וכלי חקירה - RcaAgentService פונה ל-OpenAI ישירות דרך
// HTTP (לא דרך Semantic Kernel), ולכן אין כאן רישום Kernel
// ==========================================
builder.Services.AddHttpClient();
builder.Services.AddScoped<DiagnosticPlugins>();
builder.Services.AddScoped<IRcaAgentService, RcaAgentService>();

var app = builder.Build();

// ==========================================
// 7. Request Pipeline Configuration
// ==========================================
app.UseExceptionHandler();

// ראשון בצינור בכוונה - כל middleware אחרי זה צריך לראות את ה-IP האמיתי של
// הלקוח, לא את זה של ה-proxy הפנימי של Azure
app.UseForwardedHeaders();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowReactApp");

app.UseRateLimiter();

app.UseAuthentication();
app.UseAuthorization();

app.MapHealthChecks("/health");
app.MapControllers();

app.Run();
