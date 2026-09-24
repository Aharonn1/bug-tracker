using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MyBackendApi.Migrations
{
    /// <inheritdoc />
    public partial class RemoveErrorCatalogRequiredForeignKey : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // בדיקת קיום מפורשת (IF EXISTS) - במסד הפרודקשן בפועל האילוץ הזה כבר
            // לא קיים (סטייה היסטורית בין ה-Migration History לסכמה בפועל), אבל
            // בסביבה חדשה שנפרסת מאפס (למשל דרך infra/main.bicep) הוא כן ייווצר
            // ע"י Migration קודם ולכן חייב להימחק בבטחה גם שם
            migrationBuilder.Sql(@"
                IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_SystemErrorIncidents_ErrorCatalogs_ErrorCode')
                    ALTER TABLE [SystemErrorIncidents] DROP CONSTRAINT [FK_SystemErrorIncidents_ErrorCatalogs_ErrorCode];
            ");

            migrationBuilder.Sql(@"
                IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_SystemErrorIncidents_ErrorCode' AND object_id = OBJECT_ID('SystemErrorIncidents'))
                    DROP INDEX [IX_SystemErrorIncidents_ErrorCode] ON [SystemErrorIncidents];
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_SystemErrorIncidents_ErrorCode",
                table: "SystemErrorIncidents",
                column: "ErrorCode");

            migrationBuilder.AddForeignKey(
                name: "FK_SystemErrorIncidents_ErrorCatalogs_ErrorCode",
                table: "SystemErrorIncidents",
                column: "ErrorCode",
                principalTable: "ErrorCatalogs",
                principalColumn: "ErrorCode",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
