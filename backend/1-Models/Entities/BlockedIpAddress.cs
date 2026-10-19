namespace MyBackendApi.Models.Entities;

// שורה אחת-לכל-IP, מתעדכנת (upsert) עם כל אירוע חסימה חדש - לא טבלת
// היסטוריה מלאה. "חסום כרגע" = BlockedUntil > עכשיו
public class BlockedIpAddress
{
    public long Id { get; set; }
    public string IpAddress { get; set; } = string.Empty;
    public DateTime BlockedUntil { get; set; }
    public string Reason { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
