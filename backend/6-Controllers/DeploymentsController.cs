using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using MyBackendApi.Models.DTOs.Ingestion;
using MyBackendApi.Services.Core;

namespace MyBackendApi.Controllers;

// נקרא רק מ-GitHub Actions, צעד אחרון בכל workflow דיפלוי מוצלח (ראו
// backend-deploy.yml/frontend-deploy.yml) - לא מ-Azure Monitor כמו
// AzureAlertsController, ולכן אין את אותה מגבלת "Webhook action group
// תומך רק ב-URL מלא, לא headers" - כאן זה curl רגיל, אז Authorization
// header תקני, לא טוקן ב-query string
[ApiController]
[Route("api/deployments")]
[AllowAnonymous]
[EnableRateLimiting("ingest")]
public class DeploymentsController(
    DeploymentHistoryService deploymentHistory,
    IConfiguration configuration,
    ILogger<DeploymentsController> logger) : ControllerBase
{
    private static readonly string[] ValidComponents = ["backend", "frontend"];

    [HttpPost]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> RecordDeployment(
        [FromBody] RecordDeploymentDto dto,
        CancellationToken ct)
    {
        var expectedToken = configuration["Deployments:LogSecret"];
        var providedToken = Request.Headers.Authorization.ToString().Replace("Bearer ", "");
        if (string.IsNullOrEmpty(expectedToken) || !ConstantTimeEquals(providedToken, expectedToken))
        {
            logger.LogWarning("נדחתה בקשת רישום דיפלוי עם טוקן לא תקף");
            return Unauthorized();
        }

        if (!ValidComponents.Contains(dto.Component) || string.IsNullOrWhiteSpace(dto.CommitSha))
        {
            return BadRequest(new { message = "Component חייב להיות 'backend' או 'frontend', ו-CommitSha לא יכול להיות ריק" });
        }

        await deploymentHistory.RecordDeploymentAsync(dto.Component, dto.CommitSha, ct);
        return NoContent();
    }

    private static bool ConstantTimeEquals(string? actual, string expected)
    {
        if (string.IsNullOrEmpty(actual)) return false;
        var actualBytes = Encoding.UTF8.GetBytes(actual);
        var expectedBytes = Encoding.UTF8.GetBytes(expected);
        return actualBytes.Length == expectedBytes.Length && CryptographicOperations.FixedTimeEquals(actualBytes, expectedBytes);
    }
}
