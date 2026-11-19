using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace MyBackendApi.Services.Realtime;

// Hub מאומת (JWT) - מצטרף אוטומטית ל"קבוצה" לפי ה-tenantId מהטוקן (אותו claim
// בדיוק כמו HttpContextTenantProvider), כך שדחיפות (ראו IncidentPushNotifier)
// מגיעות רק ללקוחות של אותו לקוח בדיוק - אותו עיקרון בידוד כמו ה-Global Query
// Filter ב-AppDbContext, רק בערוץ push ולא בשאילתת DB. חד-כיווני (שרת->לקוח
// בלבד) - אין כאן שום מתודה שהלקוח קורא לשרת
[Authorize]
public class IncidentHub : Hub
{
    private const string TenantClaimType = "tenantId";

    public override async Task OnConnectedAsync()
    {
        var tenantId = Context.User?.FindFirst(TenantClaimType)?.Value;
        if (!string.IsNullOrWhiteSpace(tenantId))
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, tenantId);
        }

        await base.OnConnectedAsync();
    }
}
