using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MyBackendApi.Migrations
{
    /// <inheritdoc />
    public partial class AddReportedByUserToBugsAndIncidents : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ReportedByUserId",
                table: "SystemErrorIncidents",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ReportedByUserId",
                table: "BugReports",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_SystemErrorIncidents_ReportedByUserId",
                table: "SystemErrorIncidents",
                column: "ReportedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_BugReports_ReportedByUserId",
                table: "BugReports",
                column: "ReportedByUserId");

            migrationBuilder.AddForeignKey(
                name: "FK_BugReports_Users_ReportedByUserId",
                table: "BugReports",
                column: "ReportedByUserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_SystemErrorIncidents_Users_ReportedByUserId",
                table: "SystemErrorIncidents",
                column: "ReportedByUserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_BugReports_Users_ReportedByUserId",
                table: "BugReports");

            migrationBuilder.DropForeignKey(
                name: "FK_SystemErrorIncidents_Users_ReportedByUserId",
                table: "SystemErrorIncidents");

            migrationBuilder.DropIndex(
                name: "IX_SystemErrorIncidents_ReportedByUserId",
                table: "SystemErrorIncidents");

            migrationBuilder.DropIndex(
                name: "IX_BugReports_ReportedByUserId",
                table: "BugReports");

            migrationBuilder.DropColumn(
                name: "ReportedByUserId",
                table: "SystemErrorIncidents");

            migrationBuilder.DropColumn(
                name: "ReportedByUserId",
                table: "BugReports");
        }
    }
}
