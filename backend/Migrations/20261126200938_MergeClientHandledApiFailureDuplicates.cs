using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MyBackendApi.Migrations
{
    /// <inheritdoc />
    public partial class MergeClientHandledApiFailureDuplicates : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ניקוי נתונים חד-פעמי, לא שינוי סכמה: לפני התיקון ב-
            // ErrorDeduplicationService, תקריות CLIENT_HANDLED_API_FAILURE
            // ("הרשת נכשלה") קיבלו טביעת-אצבע שונה לכל נקודת-קריאה בקוד,
            // למרות שזו תמיד אותה תקלה בפועל - אז הן התפזרו להרבה שורות
            // נפרדות במקום להצטבר לאחת עם מונה עולה. הסקריפט הזה ממזג כל
            // קבוצה (לפי TenantId+ErrorMessage) לשורה אחת - הניצולה היא
            // ה-IncidentId הגבוה ביותר בקבוצה - ומעדכן את טביעת-האצבע שלה
            // לנוסחה החדשה, כך שתקריות חדשות מאותה שגיאה ימשיכו להצטרף אליה.
            // אידמפוטנטי: אחרי ריצה ראשונה כל קבוצה נשארת עם שורה אחת, אז
            // HAVING COUNT(*) > 1 לא מוצא יותר כלום בריצה חוזרת
            migrationBuilder.Sql(@"
DECLARE @TenantId NVARCHAR(64);
DECLARE @ErrorMessage NVARCHAR(MAX);
DECLARE @SurvivorId BIGINT;

DECLARE group_cursor CURSOR LOCAL FAST_FORWARD FOR
    SELECT TenantId, ErrorMessage
    FROM SystemErrorIncidents
    WHERE ErrorCode = 'CLIENT_HANDLED_API_FAILURE'
    GROUP BY TenantId, ErrorMessage
    HAVING COUNT(*) > 1;

OPEN group_cursor;
FETCH NEXT FROM group_cursor INTO @TenantId, @ErrorMessage;

WHILE @@FETCH_STATUS = 0
BEGIN
    SELECT TOP 1 @SurvivorId = IncidentId
    FROM SystemErrorIncidents
    WHERE TenantId = @TenantId AND ErrorCode = 'CLIENT_HANDLED_API_FAILURE' AND ErrorMessage = @ErrorMessage
    ORDER BY IncidentId DESC;

    DECLARE @LosingIds TABLE (IncidentId BIGINT PRIMARY KEY);
    INSERT INTO @LosingIds (IncidentId)
    SELECT IncidentId
    FROM SystemErrorIncidents
    WHERE TenantId = @TenantId AND ErrorCode = 'CLIENT_HANDLED_API_FAILURE' AND ErrorMessage = @ErrorMessage
      AND IncidentId <> @SurvivorId;

    -- לפני המחיקה: שומרים תיעוד קריא-לאדם של כל תקרית שמתמזגת (ID, מתי
    -- נוצרה, כמה הופעות, ה-Stack Trace המקורי שלה) בתוך StackTrace של
    -- הניצולה - לא RawPayload (מפוענח כ-JSON במודעת הפרטים, טקסט חופשי שם
    -- פשוט נעלם בשקט) וגם לא ErrorMessage (חלק מנוסחת טביעת-האצבע עצמה -
    -- שינוי שלו היה שובר התאמה עתידית). כך פתיחת הניצולה מראה בדיוק מה
    -- מוזג לתוכה, לא רק מונה - זו לא פעולה עיוורת-לנתונים
    DECLARE @MergeNote NVARCHAR(MAX);

    SELECT @MergeNote = STRING_AGG(
        CONCAT(
            N'--- מוזג מתקרית #', CAST(l.IncidentId AS NVARCHAR(20)),
            N' (נוצרה ', FORMAT(l.CreatedAt, 'yyyy-MM-dd HH:mm'),
            N', ', l.OccurrencesCount, N' הופעות) ---', CHAR(13), CHAR(10),
            ISNULL(ldp.StackTrace, N'(אין Stack Trace שמור)')
        ),
        CHAR(13) + CHAR(10) + CHAR(13) + CHAR(10)
    ) WITHIN GROUP (ORDER BY l.IncidentId)
    FROM SystemErrorIncidents l
    LEFT JOIN IncidentDetailPayloads ldp ON ldp.IncidentId = l.IncidentId
    WHERE l.IncidentId IN (SELECT IncidentId FROM @LosingIds);

    IF EXISTS (SELECT 1 FROM IncidentDetailPayloads WHERE IncidentId = @SurvivorId)
    BEGIN
        UPDATE d
        SET d.StackTrace = CONCAT(
                ISNULL(d.StackTrace + CHAR(13) + CHAR(10) + CHAR(13) + CHAR(10), N''),
                N'=== היסטוריית מיזוג אוטומטי (', CONVERT(NVARCHAR(19), GETUTCDATE(), 120), N' UTC) - תקריות זהות שמוזגו לכאן ===', CHAR(13), CHAR(10),
                @MergeNote
            )
        FROM IncidentDetailPayloads d
        WHERE d.IncidentId = @SurvivorId;
    END
    ELSE
    BEGIN
        INSERT INTO IncidentDetailPayloads (IncidentId, StackTrace)
        VALUES (@SurvivorId, CONCAT(
            N'=== היסטוריית מיזוג אוטומטי (', CONVERT(NVARCHAR(19), GETUTCDATE(), 120), N' UTC) - תקריות זהות שמוזגו לכאן ===', CHAR(13), CHAR(10),
            @MergeNote
        ));
    END

    -- מיזוג OccurrencesCount ו-LastSeenAt לתוך הניצולה
    UPDATE s
    SET s.OccurrencesCount = s.OccurrencesCount + ISNULL(agg.TotalCount, 0),
        s.LastSeenAt = CASE WHEN agg.MaxLastSeen > s.LastSeenAt THEN agg.MaxLastSeen ELSE s.LastSeenAt END
    FROM SystemErrorIncidents s
    CROSS APPLY (
        SELECT SUM(l.OccurrencesCount) AS TotalCount, MAX(l.LastSeenAt) AS MaxLastSeen
        FROM SystemErrorIncidents l
        WHERE l.IncidentId IN (SELECT IncidentId FROM @LosingIds)
    ) agg
    WHERE s.IncidentId = @SurvivorId;

    -- מיזוג IncidentReporters: סכימת OccurrenceCount לכל משתמש לתוך שורה
    -- אחת על הניצולה (המפתח המורכב IncidentId+UserId אוסר שכפול)
    MERGE IncidentReporters AS target
    USING (
        SELECT UserId, SUM(OccurrenceCount) AS TotalCount, MAX(LastSeenAt) AS MaxLastSeen
        FROM IncidentReporters
        WHERE IncidentId IN (SELECT IncidentId FROM @LosingIds)
        GROUP BY UserId
    ) AS src
    ON target.IncidentId = @SurvivorId AND target.UserId = src.UserId
    WHEN MATCHED THEN
        UPDATE SET OccurrenceCount = target.OccurrenceCount + src.TotalCount,
                   LastSeenAt = CASE WHEN src.MaxLastSeen > target.LastSeenAt THEN src.MaxLastSeen ELSE target.LastSeenAt END
    WHEN NOT MATCHED THEN
        INSERT (IncidentId, UserId, OccurrenceCount, LastSeenAt)
        VALUES (@SurvivorId, src.UserId, src.TotalCount, src.MaxLastSeen);

    -- מחיקה מפורשת של הילדים לפני ההורה - לא סומכים על ON DELETE CASCADE
    DELETE FROM IncidentReporters WHERE IncidentId IN (SELECT IncidentId FROM @LosingIds);
    DELETE FROM IncidentDetailPayloads WHERE IncidentId IN (SELECT IncidentId FROM @LosingIds);
    DELETE FROM SystemErrorIncidents WHERE IncidentId IN (SELECT IncidentId FROM @LosingIds);

    -- טביעת-האצבע של הניצולה מתעדכנת לנוסחה החדשה (ErrorCode:ErrorMessage
    -- בלבד, בלי stack trace) - אותה נוסחה בדיוק כמו ב-ErrorDeduplicationService
    -- אחרי התיקון, ב-UTF-8 ולכן CONVERT ל-VARCHAR (לא NVARCHAR) לפני ה-hash
    UPDATE SystemErrorIncidents
    SET ErrorFingerprintHash = UPPER(CONVERT(VARCHAR(64),
            HASHBYTES('SHA2_256', CONVERT(VARCHAR(8000), CONCAT(ErrorCode, ':', @ErrorMessage))), 2))
    WHERE IncidentId = @SurvivorId;

    FETCH NEXT FROM group_cursor INTO @TenantId, @ErrorMessage;
END

CLOSE group_cursor;
DEALLOCATE group_cursor;
");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // אין Down משמעותי - מיזוג תקריות ומחיקת השורות המפסידות הוא
            // בלתי-הפיך (הנתונים המקוריים, כולל חותמות-זמן נפרדות לכל שורה
            // שנמחקה, לא נשמרים). לא שינוי סכמה, אז אין גם מה "לבטל" מבנית
        }
    }
}
