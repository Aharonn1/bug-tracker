using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MyBackendApi.Migrations
{
    /// <inheritdoc />
    public partial class CleanupMainOfficeSecurityTestAccounts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // חשבונות זבל שנוצרו אוטומטית ב-production ע"י security-check.sh
            // (בדיקות lockout/rate-limit שנרשמות דרך /api/Auth/register) -
            // לעולם לא עובדים אמיתיים, נשארו תקועים תחת default-tenant כי
            // X-Tenant-Id ברירת-המחדל של הסקריפט היה "default-tenant" לפני
            // שעודכן (ראו security-tests/security-check.sh). אושר מפורשות
            // למחיקה סופית ע"י המשתמש (לא רק השבתה) - 2026-11-28
            migrationBuilder.Sql(@"
                DELETE FROM Users
                WHERE TenantId = 'default-tenant'
                  AND Email LIKE 'security-%@lawfirm.co.il';
            ");

            // תקריות היסטוריות שעדיין נשארו תחת default-tenant אחרי ה-migration
            // הקודם (MoveHalevyMizrahiOfficeUsers) - שם הוחרגו תקריות שגם אהרון
            // (Id 1, SiteAdmin) דיווח עליהן יחד עם אחד מהשלושה, אבל בפועל אלו
            // בדיקות-דפדפן משותפות (למשל בדיקת חיבור רשת) שאהרון הפעיל על עצמו
            // תוך כדי בדיקות - אין סיבה שזה ימנע מהתקרית להיות משויכת למשרד
            // שבאמת מדווח עליה היום
            migrationBuilder.Sql(@"
                UPDATE SystemErrorIncidents
                SET TenantId = 'halevy-mizrahi-law'
                WHERE TenantId = 'default-tenant'
                  AND Id IN (SELECT IncidentId FROM IncidentReporters WHERE UserId IN (2, 3, 4));
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                UPDATE SystemErrorIncidents
                SET TenantId = 'default-tenant'
                WHERE TenantId = 'halevy-mizrahi-law'
                  AND Id IN (SELECT IncidentId FROM IncidentReporters WHERE UserId IN (2, 3, 4));
            ");
        }
    }
}
