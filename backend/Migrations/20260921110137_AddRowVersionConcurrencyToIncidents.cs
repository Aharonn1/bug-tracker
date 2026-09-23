using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MyBackendApi.Migrations
{
    /// <inheritdoc />
    public partial class AddRowVersionConcurrencyToIncidents : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // SQL Server אינו מאפשר ALTER COLUMN ישיר ל-rowversion על עמודה קיימת
            // (שגיאה 4927) - חייבים להפיל וליצור מחדש. הערכים הקיימים הם NULL בכל
            // השורות (העמודה מעולם לא הייתה בשימוש בפועל), כך שאין אובדן מידע אמיתי
            migrationBuilder.DropColumn(
                name: "RowVersion",
                table: "SystemErrorIncidents");

            migrationBuilder.AddColumn<byte[]>(
                name: "RowVersion",
                table: "SystemErrorIncidents",
                type: "rowversion",
                rowVersion: true,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "RowVersion",
                table: "SystemErrorIncidents");

            migrationBuilder.AddColumn<byte[]>(
                name: "RowVersion",
                table: "SystemErrorIncidents",
                type: "varbinary(max)",
                nullable: true);
        }
    }
}
