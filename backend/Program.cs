using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using Microsoft.SemanticKernel;
using MyBackendApi.Data;
using MyBackendApi.Middleware;
using MyBackendApi.Services.Agent;
using MyBackendApi.Services.Core;
using MyBackendApi.Services.Deduplication;
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

// זיהוי הלקוח (Tenant) הנוכחי מתוך ה-header של הבקשה - נדרש עבור ה-Global Query
// Filter ב-AppDbContext שמבדיל בין לקוחות שונים
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentTenantProvider, HttpContextTenantProvider>();

// ==========================================
// 5. תשתית High-Throughput Ingestion & Deduplication
// ==========================================
builder.Services.AddSingleton<IncidentChannelQueue>();
builder.Services.AddSingleton<ErrorDeduplicationService>();
builder.Services.AddHostedService<IncidentIngestionWorker>();

// ==========================================
// 6. שירותי סוכן AI וכלי חקירה (Semantic Kernel / Plugins)
// ==========================================
builder.Services.AddHttpClient();
builder.Services.AddScoped<DiagnosticPlugins>();
builder.Services.AddScoped<RemediationPlugins>();
builder.Services.AddScoped<IRcaAgentService, RcaAgentService>();

var openAiApiKey = builder.Configuration["OpenAI:ApiKey"] ?? "sk-placeholder-key";
var openAiModelId = builder.Configuration["OpenAI:ModelId"] ?? "gpt-4o-mini";

builder.Services.AddTransient(sp =>
{
    var diagnosticPlugins = sp.GetRequiredService<DiagnosticPlugins>();

    var kernelBuilder = Kernel.CreateBuilder();
    kernelBuilder.AddOpenAIChatCompletion(openAiModelId, openAiApiKey);
    kernelBuilder.Plugins.AddFromObject(diagnosticPlugins, nameof(DiagnosticPlugins));

    return kernelBuilder.Build();
});

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

app.UseAuthorization();

app.MapHealthChecks("/health");
app.MapControllers();

app.Run();
