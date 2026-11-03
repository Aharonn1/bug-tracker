namespace MyBackendApi.Models.DTOs.Telemetry;

public record DailyOccurrenceCountDto(int Day, int Count);

public record AlertTypeCountDto(string AlertType, int Count);

// סופר מתוך AzureAlertOccurrences (לוג הוספה-בלבד, בלי דה-דופליקציה) - ראו
// ההסבר המלא ב-AzureAlertOccurrence.cs על למה SystemErrorIncidents לא
// מתאימה למגמה חודשית. EarliestTrackedOccurrence מאפשר לפרונטאנד להסביר
// "0 ב-undefined חודש X" כ"עוד לא עקבנו אז" ולא "לא קרה כלום"
public record AzureHealthMonthlySummaryDto(
    int Year,
    int Month,
    int TotalOccurrences,
    List<DailyOccurrenceCountDto> DailyBreakdown,
    List<AlertTypeCountDto> ByAlertType,
    DateTimeOffset? EarliestTrackedOccurrence
);

// עוטף יחד את ספירת ההתרעות (מהדיוק המלא, בלי מגבלת שמירה) עם מדדי הביצועים
// הגולמיים לאותו חודש (כפופים למגבלות השמירה של Azure עצמו - ראו הערות
// ב-GetAppServiceHealthForRangeAsync/GetSqlHealthForRangeAsync). שדה null
// במדדים אומר "אין נתונים לטווח הזה" (חודש ישן מדי, או לא מוגדר), לא תקלה
public record AzureHealthMonthlyDto(
    AzureHealthMonthlySummaryDto Occurrences,
    AppServiceHealthMetricsDto? AppServiceMetrics,
    SqlHealthMetricsDto? SqlMetrics
);
