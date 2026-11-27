using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MyBackendApi.Migrations
{
    /// <inheritdoc />
    public partial class DeleteScaleTestIncidents : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ניקוי נתונים חד-פעמי, לא שינוי סכמה: מוחק תקריות-בדיקה שנוצרו
            // על ידי כלי בדיקת-העומס (TenantScaleTestCard, בעמוד "בריאות
            // תשתית Azure") - הכלי שולח תקריות אמיתיות וקבועות ל-production
            // במכוון (כדי לבדוק Rate Limiting אמיתי), ומזהיר בתוכו שאין דרך
            // למחוק אותן מתוך האתר. הזיהוי חד-משמעי: TenantId תמיד
            // "scale-test-tenant-NNN" ו-ErrorCode תמיד "SCALE_TEST_ERR" -
            // אין חפיפה עם אף תקרית אמיתית. אידמפוטנטי מטבעו: בריצה חוזרת
            // ה-WHERE כבר לא מוצא כלום
            migrationBuilder.Sql(@"
DECLARE @ScaleTestIds TABLE (IncidentId BIGINT PRIMARY KEY);
INSERT INTO @ScaleTestIds (IncidentId)
SELECT IncidentId
FROM SystemErrorIncidents
WHERE ErrorCode = 'SCALE_TEST_ERR' AND TenantId LIKE 'scale-test-tenant-%';

DELETE FROM IncidentReporters WHERE IncidentId IN (SELECT IncidentId FROM @ScaleTestIds);
DELETE FROM IncidentDetailPayloads WHERE IncidentId IN (SELECT IncidentId FROM @ScaleTestIds);
DELETE FROM SystemErrorIncidents WHERE IncidentId IN (SELECT IncidentId FROM @ScaleTestIds);
");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // אין Down משמעותי - מחיקה היא בלתי-הפיכה, ואלו ממילא שורות-בדיקה
            // שאין טעם לשחזר. לא שינוי סכמה, אז אין גם מה "לבטל" מבנית
        }
    }
}
