using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MyBackendApi.Migrations
{
    /// <inheritdoc />
    public partial class MoveHalevyMizrahiOfficeUsers : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 2,
                column: "TenantId",
                value: "halevy-mizrahi-law");

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 3,
                column: "TenantId",
                value: "halevy-mizrahi-law");

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 4,
                column: "TenantId",
                value: "halevy-mizrahi-law");

            // ה-UpdateData למעלה מזיז רק את שורות ה-Users עצמן - תקריות/באגים
            // היסטוריים שהמשתמשים האלה כבר דיווחו עליהם נושאים TenantId קבוע
            // משלהם (לא עוקב אוטומטית אחרי המשתמש), אז בלי זה הם היו נשארים
            // "תקועים" תחת default-tenant, נראים רק ל-SiteAdmin. ה-NOT IN מגן
            // על תקריות שגם אהרון (Id 1, SiteAdmin) דיווח עליהן יחד עם אחד
            // מהשלושה (fingerprint משותף) - אלו צריכות להישאר ב-default-tenant
            migrationBuilder.Sql(@"
                UPDATE SystemErrorIncidents
                SET TenantId = 'halevy-mizrahi-law'
                WHERE TenantId = 'default-tenant'
                  AND Id IN (SELECT IncidentId FROM IncidentReporters WHERE UserId IN (2, 3, 4))
                  AND Id NOT IN (SELECT IncidentId FROM IncidentReporters WHERE UserId = 1);
            ");

            migrationBuilder.Sql(@"
                UPDATE BugReports
                SET TenantId = 'halevy-mizrahi-law'
                WHERE TenantId = 'default-tenant'
                  AND ReportedByUserId IN (2, 3, 4);
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                UPDATE BugReports
                SET TenantId = 'default-tenant'
                WHERE TenantId = 'halevy-mizrahi-law'
                  AND ReportedByUserId IN (2, 3, 4);
            ");

            migrationBuilder.Sql(@"
                UPDATE SystemErrorIncidents
                SET TenantId = 'default-tenant'
                WHERE TenantId = 'halevy-mizrahi-law'
                  AND Id IN (SELECT IncidentId FROM IncidentReporters WHERE UserId IN (2, 3, 4));
            ");

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 2,
                column: "TenantId",
                value: "default-tenant");

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 3,
                column: "TenantId",
                value: "default-tenant");

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 4,
                column: "TenantId",
                value: "default-tenant");
        }
    }
}
