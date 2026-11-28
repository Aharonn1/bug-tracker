using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MyBackendApi.Migrations
{
    /// <inheritdoc />
    public partial class FixIncidentTenantMoveColumnName : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // תיקון: שני ה-migrations הקודמים (MoveHalevyMizrahiOfficeUsers,
            // CleanupMainOfficeSecurityTestAccounts) ניסו להזיז תקריות לפי
            // "WHERE Id IN (...)" - אבל עמודת המפתח האמיתית ב-SystemErrorIncidents
            // נקראת IncidentId, לא Id. ה-UPDATE נכשל עם "Invalid column name 'Id'"
            // בשתי הפעמים - אבל ה-INSERT ל-__EFMigrationsHistory שבא אחריו באותו
            // סקריפט רץ בכל זאת (sqlcmd ממשיך אחרי שגיאה ב-GO batch נפרד), אז שתי
            // ה-migrations סומנו "הופעלו" למרות שה-UPDATE בפועל מעולם לא עבד
            migrationBuilder.Sql(@"
                UPDATE SystemErrorIncidents
                SET TenantId = 'halevy-mizrahi-law'
                WHERE TenantId = 'default-tenant'
                  AND IncidentId IN (SELECT IncidentId FROM IncidentReporters WHERE UserId IN (2, 3, 4));
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                UPDATE SystemErrorIncidents
                SET TenantId = 'default-tenant'
                WHERE TenantId = 'halevy-mizrahi-law'
                  AND IncidentId IN (SELECT IncidentId FROM IncidentReporters WHERE UserId IN (2, 3, 4));
            ");
        }
    }
}
