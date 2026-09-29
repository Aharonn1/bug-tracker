using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MyBackendApi.Migrations
{
    /// <inheritdoc />
    public partial class AddIncidentReportersManyToMany : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // 1. יוצרים את טבלת הקישור החדשה לפני מחיקת העמודה הישנה, כדי שאפשר
            // יהיה למלא אותה מהנתונים הקיימים לפני שהם נעלמים
            migrationBuilder.CreateTable(
                name: "IncidentReporters",
                columns: table => new
                {
                    IncidentId = table.Column<long>(type: "bigint", nullable: false),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    OccurrenceCount = table.Column<int>(type: "int", nullable: false),
                    LastSeenAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_IncidentReporters", x => new { x.IncidentId, x.UserId });
                    table.ForeignKey(
                        name: "FK_IncidentReporters_SystemErrorIncidents_IncidentId",
                        column: x => x.IncidentId,
                        principalTable: "SystemErrorIncidents",
                        principalColumn: "IncidentId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_IncidentReporters_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_IncidentReporters_UserId",
                table: "IncidentReporters",
                column: "UserId");

            // 2. מעבירים את השיוך היחיד שהיה קיים (ReportedByUserId) לטבלת הקישור
            // החדשה, לפני שהעמודה נמחקת
            migrationBuilder.Sql(@"
                INSERT INTO IncidentReporters (IncidentId, UserId, OccurrenceCount, LastSeenAt)
                SELECT IncidentId, ReportedByUserId, OccurrencesCount, LastSeenAt
                FROM SystemErrorIncidents
                WHERE ReportedByUserId IS NOT NULL");

            // 3. מנקים תקריות ובאגים היסטוריים שאין להם שיוך למשתמש בכלל - נתונים
            // "יתומים" מלפני שהייתה מערכת התחברות, לפי בקשת בעל המערכת
            migrationBuilder.Sql(@"
                DELETE FROM SystemErrorIncidents
                WHERE IncidentId NOT IN (SELECT IncidentId FROM IncidentReporters)");

            migrationBuilder.Sql(@"
                DELETE FROM BugReports
                WHERE ReportedByUserId IS NULL");

            // 4. עכשיו אפשר למחוק את העמודה הישנה בבטחה
            migrationBuilder.DropForeignKey(
                name: "FK_SystemErrorIncidents_Users_ReportedByUserId",
                table: "SystemErrorIncidents");

            migrationBuilder.DropIndex(
                name: "IX_SystemErrorIncidents_ReportedByUserId",
                table: "SystemErrorIncidents");

            migrationBuilder.DropColumn(
                name: "ReportedByUserId",
                table: "SystemErrorIncidents");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "IncidentReporters");

            migrationBuilder.AddColumn<int>(
                name: "ReportedByUserId",
                table: "SystemErrorIncidents",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_SystemErrorIncidents_ReportedByUserId",
                table: "SystemErrorIncidents",
                column: "ReportedByUserId");

            migrationBuilder.AddForeignKey(
                name: "FK_SystemErrorIncidents_Users_ReportedByUserId",
                table: "SystemErrorIncidents",
                column: "ReportedByUserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }
    }
}
