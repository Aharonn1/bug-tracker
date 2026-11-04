using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using MyBackendApi.Data;
using MyBackendApi.Models.Entities;

namespace MyBackendApi.Services.Core;

// ErrorCatalogs הוא טבלת-עזר כמעט-סטטית (עשרות שורות, משתנה רק דרך
// migration/deploy, אף פעם לא דרך ה-API) - ובכל זאת נשלפה מה-DB מחדש בכל
// בקשה אחת שנוגעת בתקרית (רשימה, פרט בודד, התראת מייל). בקנה מידה של
// אלפי לקוחות, זו קריאת DB מיותרת לגמרי על כל מסך תקריות שנטען. TTL של
// 10 דקות סביר: גם אם מישהו באמת מוסיף ErrorCode חדש בדיוק עכשיו, חלון
// ההשהיה קצר בהרבה מתדירות הפריסות בפועל, ו-restart של ה-App Service
// (שקורה בכל deploy) ממילא מנקה את המטמון מההתחלה
public class ErrorCatalogCacheService(AppDbContext context, IMemoryCache cache)
{
    private const string CacheKey = "ErrorCatalogs:All";
    private static readonly TimeSpan CacheDuration = TimeSpan.FromMinutes(10);

    public async Task<IReadOnlyDictionary<string, ErrorCatalog>> GetAllAsync(CancellationToken ct = default)
    {
        if (cache.TryGetValue(CacheKey, out Dictionary<string, ErrorCatalog>? cached) && cached is not null)
        {
            return cached;
        }

        var catalogs = await context.ErrorCatalogs.AsNoTracking().ToDictionaryAsync(c => c.ErrorCode, ct);
        cache.Set(CacheKey, catalogs, CacheDuration);
        return catalogs;
    }

    public async Task<ErrorCatalog?> GetByCodeAsync(string errorCode, CancellationToken ct = default)
    {
        var all = await GetAllAsync(ct);
        return all.GetValueOrDefault(errorCode);
    }
}
