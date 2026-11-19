using Microsoft.AspNetCore.SignalR;

namespace MyBackendApi.Services.Realtime;

// עטיפה דקה מעל IHubContext - כך IncidentService לא תלוי ישירות ב-SignalR,
// ויש מקום אחד שיודע את שם ה-event המדויק ("newIncident") שהלקוח מאזין לו.
// שלב ראשון מכוון (לא SignalR חיצוני עדיין) - ראו הערה ב-Program.cs ליד AddSignalR
public class IncidentPushNotifier(IHubContext<IncidentHub> hubContext)
{
    public Task NotifyNewIncidentAsync(string tenantId) =>
        hubContext.Clients.Group(tenantId).SendAsync("newIncident");
}
