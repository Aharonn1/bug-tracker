using Microsoft.EntityFrameworkCore;
using MyBackendApi.Data;
using MyBackendApi.Models.DTOs.Responses;
using MyBackendApi.Models.Entities;
using MyBackendApi.Services.Interfaces;

namespace MyBackendApi.Services.Core;

public class LoginSecurityService(AppDbContext context) : ILoginSecurityService
{
    public async Task<IReadOnlyList<LoginAttemptSummaryDto>> GetRecentAttemptsAsync(int take = 200, CancellationToken ct = default)
    {
        var rows = await context.LoginAttempts
            .AsNoTracking()
            .OrderByDescending(a => a.AttemptedAt)
            .Take(Math.Clamp(take, 1, 500))
            .ToListAsync(ct);

        return rows.Select(a => new LoginAttemptSummaryDto(
            a.Id, a.Email, a.IpAddress, a.TenantId, a.Outcome.ToString(), a.AttemptedAt)).ToList();
    }

    public async Task<IReadOnlyList<BlockedIpSummaryDto>> GetBlockedIpsAsync(CancellationToken ct = default)
    {
        var rows = await context.BlockedIpAddresses
            .AsNoTracking()
            .Where(b => b.BlockedUntil > DateTime.UtcNow)
            .OrderByDescending(b => b.BlockedUntil)
            .ToListAsync(ct);

        return rows.Select(b => new BlockedIpSummaryDto(
            b.Id, b.IpAddress, b.BlockedUntil, b.Reason, b.CreatedAt)).ToList();
    }

    // אידמפוטנטי בכוונה - ביטול חסימה על IP שלא חסום כרגע (או מעולם לא היה)
    // הוא לא-פעולה תקינה, לא שגיאה
    public async Task UnblockAsync(string ip, CancellationToken ct = default)
    {
        var block = await context.BlockedIpAddresses.FirstOrDefaultAsync(b => b.IpAddress == ip, ct);
        if (block is null) return;

        block.BlockedUntil = DateTime.UtcNow;
        block.UpdatedAt = DateTime.UtcNow;
        await context.SaveChangesAsync(ct);
    }

    public async Task BlockManuallyAsync(string ip, int durationHours, CancellationToken ct = default)
    {
        var existing = await context.BlockedIpAddresses.FirstOrDefaultAsync(b => b.IpAddress == ip, ct);
        var blockedUntil = DateTime.UtcNow.AddHours(Math.Clamp(durationHours, 1, 24 * 30));
        const string reason = "חסימה ידנית ע\"י מנהל-על";

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
}
