using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MyBackendApi.Migrations
{
    /// <inheritdoc />
    public partial class RemoveLegacyErrorCatalogForeignKey : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // אילוץ FK ישן בשם FK_Incidents_ErrorCatalog קיים בפועל על הטבלה אבל
            // אף פעם לא היה חלק מה-Migration History (סטיית סכמה היסטורית, כנראה
            // משם ישן של הטבלה) - EF לא ידע להסיר אותו במיגרציה הקודמת שהתמקדה
            // רק ב-FK_SystemErrorIncidents_ErrorCatalogs_ErrorCode. הוא זה שדחה
            // בשקט כל תקרית עם ErrorCode לא-מתועד עד עכשיו
            migrationBuilder.Sql(@"
                IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Incidents_ErrorCatalog')
                    ALTER TABLE [SystemErrorIncidents] DROP CONSTRAINT [FK_Incidents_ErrorCatalog];
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {

        }
    }
}
