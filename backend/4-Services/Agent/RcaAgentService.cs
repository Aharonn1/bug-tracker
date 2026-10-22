using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using MyBackendApi.Exceptions;
using MyBackendApi.Models.Common;
using MyBackendApi.Services.Interfaces;
using MyBackendApi.Services.Plugins;

namespace MyBackendApi.Services.Agent;

public class RcaAgentService : IRcaAgentService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<RcaAgentService> _logger;
    private readonly DiagnosticPlugins _plugins;
    private readonly HttpClient _httpClient;

    public RcaAgentService(
        IConfiguration configuration,
        ILogger<RcaAgentService> logger,
        DiagnosticPlugins plugins,
        IHttpClientFactory httpClientFactory)
    {
        _configuration = configuration;
        _logger = logger;
        _plugins = plugins;
        _httpClient = httpClientFactory.CreateClient();
    }

    public async Task<string> AnalyzeAndRemediateIncidentAsync(
        string errorCode,
        string errorMessage,
        string category,
        string subsystem,
        string hebrewDescription,
        string? caseNumber,
        string? playbook,
        string? stackTrace,
        CancellationToken ct = default)
    {
        var apiKey = _configuration["AzureOpenAI:ApiKey"];
        var endpoint = _configuration["AzureOpenAI:Endpoint"]?.TrimEnd('/');
        var deployment = _configuration["AzureOpenAI:DeploymentName"];
        var apiVersion = _configuration["AzureOpenAI:ApiVersion"] ?? "2024-06-01";

        var toolsDefinition = new object[]
        {
            new
            {
                type = "function",
                function = new
                {
                    name = "check_gateway_latency",
                    description = "בודק זמינות, זמני תגובה וקוד HTTP של שערי הממשלה (NetMishpat, Tehila, ECA). השתמש בכלי זה רק אם התקלה קשורה ישירות לחיבור לשער ממשלתי חיצוני - לא עבור שגיאות פנימיות של האפליקציה עצמה (צד-לקוח, שרת, בסיס נתונים)",
                    parameters = new
                    {
                        type = "object",
                        properties = new
                        {
                            targetGateway = new 
                            { 
                                type = "string", 
                                @enum = new[] { "NetMishpat", "Tehila", "Eca" },
                                description = "שם שער הממשלה" 
                            }
                        },
                        required = new[] { "targetGateway" }
                    }
                }
            },
            new
            {
                type = "function",
                function = new
                {
                    name = "inspect_smartcard_cert",
                    description = "בודק תוקף תעודת חתימה אלקטרונית ומצב דרייבר הכרטיס החכם בעמדה. השתמש בכלי זה רק אם התקלה קשורה ישירות לחתימה דיגיטלית או לכרטיס חכם - לא עבור שגיאות פנימיות אחרות",
                    parameters = new
                    {
                        type = "object",
                        properties = new
                        {
                            thumbprint = new { type = "string", description = "טביעת אצבע או מזהה כרטיס אם קיים" }
                        }
                    }
                }
            }
        };

        var messages = new JsonArray
        {
            new JsonObject
            {
                ["role"] = "system",
                // כללי בכוונה, לא ממוקד שערי ממשלה - רוב התקלות במערכת הן
                // שגיאות פנימיות (צד-לקוח/שרת/בסיס נתונים), לא בעיות חיבור
                // לשער חיצוני. הניתוח חייב להתבסס על הקטגוריה/תת-המערכת
                // האמיתיות של התקרית, לא על הנחה גורפת. הכלים זמינים אבל
                // לא חובה - רק כשבאמת רלוונטי לתוכן התקרית
                ["content"] = "אתה סוכן תחקור תקלות Tier-3 במערכת ניטור לתוכנה משפטית (law-tech). " +
                    "נתח את התקלה בהתבסס על הקוד, הקטגוריה, תת-המערכת והתיאור שניתנו לך. " +
                    "אם התקלה קשורה ישירות לחיבור לשער ממשלתי חיצוני (NetMishpat/Tehila/ECA) או לחתימה דיגיטלית/כרטיס חכם - " +
                    "השתמש בכלי הבדיקה הרלוונטי כדי לאסוף ממצאים לפני מסקנה. " +
                    "אחרת (למשל שגיאת צד-לקוח, שגיאת שרת פנימית, בעיית בסיס נתונים, או תקרית בדיקה/הדגמה) - " +
                    "אל תפעיל את הכלים כלל, ותן ניתוח וסקנה ישירים המבוססים רק על המידע שסופק."
            },
            new JsonObject
            {
                ["role"] = "user",
                // Stack trace מקוצר ל-2000 תווים (לא כל ה-trace) - ה-frame
                // הראשון, הכי קרוב למקור הזריקה, כבר נמצא בתחילת הטקסט,
                // ושם בדיוק המידע הכי רלוונטי לניתוח
                ["content"] = $"תקלה לבדיקה:\n" +
                    $"קוד: {errorCode}\n" +
                    $"קטגוריה: {category}\n" +
                    $"תת-מערכת: {subsystem}\n" +
                    $"תיאור: {hebrewDescription}\n" +
                    $"מספר תיק: {caseNumber ?? "ללא"}\n" +
                    $"הודעה: {errorMessage}\n" +
                    $"Playbook: {playbook ?? "ללא"}" +
                    (string.IsNullOrEmpty(stackTrace) ? "" :
                        $"\nStack Trace (אם יש בו שורה עם 'in <קובץ>:line <מספר>' - " +
                        $"זה מצביע על המיקום המדויק בקוד, ציין אותו בניתוח):\n" +
                        stackTrace[..Math.Min(stackTrace.Length, 2000)])
            }
        };

        // שלב 1: שליחה עם הגדרת הכלים
        var firstResponse = await CallAzureOpenAiAsync(endpoint!, deployment!, apiVersion, apiKey!, messages, toolsDefinition, ct);
        var choice = firstResponse["choices"]?[0]?["message"];

        // שלב 2: טיפול בקריאות כלים (Function Calls)
        if (choice?["tool_calls"] is JsonArray toolCalls && toolCalls.Count > 0)
        {
            messages.Add(choice.DeepClone());

            foreach (var toolCall in toolCalls)
            {
                var functionName = toolCall?["function"]?["name"]?.GetValue<string>();
                var argumentsJson = toolCall?["function"]?["arguments"]?.GetValue<string>() ?? "{}";
                var toolCallId = toolCall?["id"]?.GetValue<string>();

                using var argsDoc = JsonDocument.Parse(argumentsJson);
                var args = argsDoc.RootElement;

                string toolResultJson = "{}";

                if (functionName == "check_gateway_latency")
                {
                    var gwString = args.TryGetProperty("targetGateway", out var p) ? p.GetString() : null;
                    var gateway = Enum.TryParse<TargetGateway>(gwString, true, out var parsedGw) 
                        ? parsedGw 
                        : TargetGateway.Unknown;

                    var result = await _plugins.CheckGovernmentGatewayLatencyAsync(gateway);
                    toolResultJson = JsonSerializer.Serialize(result);
                }
                else if (functionName == "inspect_smartcard_cert")
                {
                    var thumb = args.TryGetProperty("thumbprint", out var p) ? p.GetString() : null;
                    var result = await _plugins.InspectSmartCardCertificateAsync(thumb);
                    toolResultJson = JsonSerializer.Serialize(result);
                }

                _logger.LogInformation("[Tool Executed] {Tool} החזיר תוצאה: {Result}", functionName, toolResultJson);

                messages.Add(new JsonObject
                {
                    ["role"] = "tool",
                    ["tool_call_id"] = toolCallId,
                    ["content"] = toolResultJson
                });
            }

            // שלב 3: הפקת דו"ח סופי
            var finalResponse = await CallAzureOpenAiAsync(endpoint!, deployment!, apiVersion, apiKey!, messages, null, ct);
            return finalResponse["choices"]?[0]?["message"]?["content"]?.GetValue<string>() ?? "לא התקבל דו״ח סופי.";
        }

        return choice?["content"]?.GetValue<string>() ?? "לא התקבלה תשובה מהמודל.";
    }

    private static readonly TimeSpan RequestTimeout = TimeSpan.FromSeconds(25);

    private async Task<JsonObject> CallAzureOpenAiAsync(
        string endpoint,
        string deployment,
        string apiVersion,
        string apiKey,
        JsonArray messages,
        object[]? tools,
        CancellationToken ct)
    {
        // Azure OpenAI לא מקבל "model" בגוף הבקשה - המודל נקבע לגמרי לפי ה-deployment
        // שב-URL, לא כמו OpenAI הציבורי
        var payload = new JsonObject
        {
            ["messages"] = messages.DeepClone(),
            ["temperature"] = 0.1
        };

        if (tools != null)
        {
            payload["tools"] = JsonSerializer.SerializeToNode(tools);
        }

        var requestUri = $"{endpoint}/openai/deployments/{deployment}/chat/completions?api-version={apiVersion}";

        // ניסיון ראשון + ניסיון חוזר בודד עבור תקלות חולפות (עומס/שגיאת שרת),
        // בדומה ל-EnableRetryOnFailure שכבר משמש אצלנו מול Azure SQL
        for (var attempt = 1; attempt <= 2; attempt++)
        {
            using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(ct);
            timeoutCts.CancelAfter(RequestTimeout);

            using var req = new HttpRequestMessage(HttpMethod.Post, requestUri)
            {
                Content = new StringContent(payload.ToJsonString(), Encoding.UTF8, "application/json")
            };
            // Azure OpenAI מאמת עם header "api-key" - לא Authorization: Bearer כמו OpenAI הציבורי
            req.Headers.Add("api-key", apiKey);

            HttpResponseMessage res;
            try
            {
                res = await _httpClient.SendAsync(req, timeoutCts.Token);
            }
            catch (OperationCanceledException) when (!ct.IsCancellationRequested)
            {
                throw new AiServiceUnavailableException(
                    $"הבקשה לסוכן ה-AI ארכה יותר מ-{RequestTimeout.TotalSeconds:0} שניות ובוטלה. נסה שוב, ואם זה חוזר - ייתכן ששירות ה-AI עמוס.");
            }

            using (res)
            {
                if (res.IsSuccessStatusCode)
                {
                    var jsonStr = await res.Content.ReadAsStringAsync(ct);
                    return JsonNode.Parse(jsonStr)!.AsObject();
                }

                var isRetryable = res.StatusCode == System.Net.HttpStatusCode.TooManyRequests || (int)res.StatusCode >= 500;
                if (isRetryable && attempt == 1)
                {
                    var retryAfter = res.Headers.RetryAfter?.Delta ?? TimeSpan.FromSeconds(2);
                    await Task.Delay(retryAfter, ct);
                    continue;
                }

                var errorBody = await res.Content.ReadAsStringAsync(ct);
                throw res.StatusCode switch
                {
                    System.Net.HttpStatusCode.TooManyRequests => new AiServiceUnavailableException(
                        "שירות ה-AI עמוס כרגע (הגבלת קצב מול הספק). מומלץ לנסות שוב בעוד דקה."),
                    System.Net.HttpStatusCode.Unauthorized or System.Net.HttpStatusCode.Forbidden => new AiServiceUnavailableException(
                        "תקלת הרשאות מול ספק ה-AI (מפתח API שגוי או פג תוקף). יש לפנות לצוות התשתיות."),
                    var code when (int)code >= 500 => new AiServiceUnavailableException(
                        "שירות ה-AI החיצוני אינו זמין כרגע. נסה שוב מאוחר יותר."),
                    _ => new InvalidOperationException($"Azure OpenAI Error ({res.StatusCode}): {errorBody}")
                };
            }
        }

        throw new AiServiceUnavailableException("שירות ה-AI החיצוני אינו זמין כרגע. נסה שוב מאוחר יותר.");
    }
}