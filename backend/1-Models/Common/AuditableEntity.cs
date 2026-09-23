namespace MyBackendApi.Models.Common;

public abstract class AuditableEntity
{
    // עמוד השדרה של Enterprise Multi-Tenancy - בידוד מוחלט בין לקוחות שונים
    public string TenantId { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public string? CreatedBy { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public string? UpdatedBy { get; set; }

    // מיועד למניעת דריסות מקבילות (Optimistic Concurrency Control)
    public byte[]? RowVersion { get; set; }
}