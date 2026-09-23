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
        string? caseNumber,
        string? playbook,
        CancellationToken ct = default)
    {
        var apiKey = _configuration["OpenAI:ApiKey"];
        var modelId = _configuration["OpenAI:ModelId"] ?? "gpt-4o-mini";

        var toolsDefinition = new object[]
        {
            new
            {
                type = "function",
                function = new
                {
                    name = "check_gateway_latency",
                    description = "בודק זמינות, זמני תגובה וקוד HTTP של שערי הממשלה (NetMishpat, Tehila, ECA)",
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
                    description = "בודק תוקף תעודת חתימה אלקטרונית ומצב דרייבר הכרטיס החכם בעמדה",
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
                ["content"] = "אתה סוכן תחקור תקלות Tier-3 מומחה לשערי ממשלה ומערכות משפטיות. עליך להפעיל כלי בדיקה מתאימים (Function Call) כדי לאסוף ממצאים חיים מהמערכת לפני הסקת מסקנות סופיות."
            },
            new JsonObject
            {
                ["role"] = "user",
                ["content"] = $"תקלה לבדיקה:\nקוד: {errorCode}\nמספר תיק: {caseNumber ?? "ללא"}\nהודעה: {errorMessage}\nPlaybook: {playbook ?? "ללא"}"
            }
        };

        // שלב 1: שליחה עם הגדרת הכלים
        var firstResponse = await CallOpenAiAsync(modelId, apiKey!, messages, toolsDefinition, ct);
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
            var finalResponse = await CallOpenAiAsync(modelId, apiKey!, messages, null, ct);
            return finalResponse["choices"]?[0]?["message"]?["content"]?.GetValue<string>() ?? "לא התקבל דו״ח סופי.";
        }

        return choice?["content"]?.GetValue<string>() ?? "לא התקבלה תשובה מהמודל.";
    }

    private static readonly TimeSpan RequestTimeout = TimeSpan.FromSeconds(25);

    private async Task<JsonObject> CallOpenAiAsync(
        string modelId,
        string apiKey,
        JsonArray messages,
        object[]? tools,
        CancellationToken ct)
    {
        var payload = new JsonObject
        {
            ["model"] = modelId,
            ["messages"] = messages.DeepClone(),
            ["temperature"] = 0.1
        };

        if (tools != null)
        {
            payload["tools"] = JsonSerializer.SerializeToNode(tools);
        }

        // ניסיון ראשון + ניסיון חוזר בודד עבור תקלות חולפות (עומס/שגיאת שרת),
        // בדומה ל-EnableRetryOnFailure שכבר משמש אצלנו מול Azure SQL
        for (var attempt = 1; attempt <= 2; attempt++)
        {
            using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(ct);
            timeoutCts.CancelAfter(RequestTimeout);

            using var req = new HttpRequestMessage(HttpMethod.Post, "https://api.openai.com/v1/chat/completions")
            {
                Content = new StringContent(payload.ToJsonString(), Encoding.UTF8, "application/json")
            };
            req.Headers.Add("Authorization", $"Bearer {apiKey}");

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
                    _ => new InvalidOperationException($"OpenAI Error ({res.StatusCode}): {errorBody}")
                };
            }
        }

        throw new AiServiceUnavailableException("שירות ה-AI החיצוני אינו זמין כרגע. נסה שוב מאוחר יותר.");
    }
}