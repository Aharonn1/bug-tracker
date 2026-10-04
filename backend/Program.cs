using System.Text;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
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
// 1. הגדרת CORS
// ==========================================
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
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
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(
        builder.Configuration.GetConnectionString("DefaultConnection"),
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

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowReactApp");

app.UseAuthentication();
app.UseAuthorization();

app.MapHealthChecks("/health");
app.MapControllers();

app.Run();
