using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MyBackendApi.Migrations
{
    /// <inheritdoc />
    public partial class SyncIncidentModels : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ==========================================
            // BugReports - הרחבת עמודות Audit קיימות
            // ==========================================
            migrationBuilder.AlterColumn<string>(
                name: "Title",
                table: "BugReports",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AlterColumn<string>(
                name: "SystemModule",
                table: "BugReports",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AlterColumn<byte>(
                name: "Status",
                table: "BugReports",
                type: "tinyint",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "int");

            migrationBuilder.AlterColumn<byte>(
                name: "Priority",
                table: "BugReports",
                type: "tinyint",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "int");

            migrationBuilder.AddColumn<string>(
                name: "CreatedBy",
                table: "BugReports",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<byte[]>(
                name: "RowVersion",
                table: "BugReports",
                type: "varbinary(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TenantId",
                table: "BugReports",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAt",
                table: "BugReports",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "UpdatedBy",
                table: "BugReports",
                type: "nvarchar(max)",
                nullable: true);

            // ==========================================
            // ErrorCatalogs - הטבלה כבר קיימת ב-DB; מוסיפים רק את מה שחסר
            // ==========================================
            migrationBuilder.AlterColumn<byte>(
                name: "SeverityLevel",
                table: "ErrorCatalogs",
                type: "tinyint",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "int");

            migrationBuilder.AddColumn<string>(
                name: "TenantId",
                table: "ErrorCatalogs",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<DateTime>(
                name: "CreatedAt",
                table: "ErrorCatalogs",
                type: "datetime2",
                nullable: false,
                defaultValueSql: "GETUTCDATE()");

            migrationBuilder.AddColumn<string>(
                name: "CreatedBy",
                table: "ErrorCatalogs",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAt",
                table: "ErrorCatalogs",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "UpdatedBy",
                table: "ErrorCatalogs",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<byte[]>(
                name: "RowVersion",
                table: "ErrorCatalogs",
                type: "varbinary(max)",
                nullable: true);

            // ==========================================
            // SystemErrorIncidents - הטבלה כבר קיימת ב-DB עם StackTrace/RawPayload
            // מוטמעים בה; מוסיפים עמודות חדשות כ-nullable, מבצעים Backfill,
            // ורק אז הופכים ל-NOT NULL
            // ==========================================
            migrationBuilder.AddColumn<string>(
                name: "ErrorFingerprintHash",
                table: "SystemErrorIncidents",
                type: "nvarchar(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.AddColumn<byte>(
                name: "Status",
                table: "SystemErrorIncidents",
                type: "tinyint",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "OccurrencesCount",
                table: "SystemErrorIncidents",
                type: "int",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastSeenAt",
                table: "SystemErrorIncidents",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TenantId",
                table: "SystemErrorIncidents",
                type: "nvarchar(64)",
                maxLength: 64,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "CreatedBy",
                table: "SystemErrorIncidents",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAt",
                table: "SystemErrorIncidents",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "UpdatedBy",
                table: "SystemErrorIncidents",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<byte[]>(
                name: "RowVersion",
                table: "SystemErrorIncidents",
                type: "varbinary(max)",
                nullable: true);

            // Backfill: LastSeenAt מ-CreatedAt הקיים, Status לפי IsResolved,
            // ו-ErrorFingerprintHash מחושב באותו אלגוריתם כמו ErrorDeduplicationService
            // (SHA-256 על ErrorCode:ErrorMessage:150 התווים הראשונים של ה-StackTrace)
            migrationBuilder.Sql(@"
                UPDATE SystemErrorIncidents
                SET LastSeenAt = CreatedAt,
                    Status = CASE WHEN IsResolved = 1 THEN 6 ELSE 1 END,
                    ErrorFingerprintHash = UPPER(CONVERT(varchar(64),
                        HASHBYTES('SHA2_256', ErrorCode + ':' + ErrorMessage + ':' + ISNULL(LEFT(StackTrace, 150), '')),
                        2))
                WHERE ErrorFingerprintHash IS NULL;
            ");

            migrationBuilder.AlterColumn<DateTime>(
                name: "LastSeenAt",
                table: "SystemErrorIncidents",
                type: "datetime2",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "datetime2",
                oldNullable: true);

            migrationBuilder.AlterColumn<byte>(
                name: "Status",
                table: "SystemErrorIncidents",
                type: "tinyint",
                nullable: false,
                oldClrType: typeof(byte),
                oldType: "tinyint",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "ErrorFingerprintHash",
                table: "SystemErrorIncidents",
                type: "nvarchar(64)",
                maxLength: 64,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(64)",
                oldMaxLength: 64,
                oldNullable: true);

            // ==========================================
            // IncidentDetailPayloads - טבלה חדשה; מעבירים אליה את הנתונים
            // הקיימים מתוך SystemErrorIncidents.StackTrace/RawPayload
            // ==========================================
            migrationBuilder.CreateTable(
                name: "IncidentDetailPayloads",
                columns: table => new
                {
                    IncidentId = table.Column<long>(type: "bigint", nullable: false),
                    StackTrace = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    RawPayload = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_IncidentDetailPayloads", x => x.IncidentId);
                    table.ForeignKey(
                        name: "FK_IncidentDetailPayloads_SystemErrorIncidents_IncidentId",
                        column: x => x.IncidentId,
                        principalTable: "SystemErrorIncidents",
                        principalColumn: "IncidentId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.Sql(@"
                INSERT INTO IncidentDetailPayloads (IncidentId, StackTrace, RawPayload)
                SELECT IncidentId, StackTrace, RawPayload FROM SystemErrorIncidents;
            ");

            migrationBuilder.DropColumn(
                name: "StackTrace",
                table: "SystemErrorIncidents");

            migrationBuilder.DropColumn(
                name: "RawPayload",
                table: "SystemErrorIncidents");

            migrationBuilder.CreateIndex(
                name: "IX_SystemErrorIncidents_ErrorCode",
                table: "SystemErrorIncidents",
                column: "ErrorCode");

            migrationBuilder.CreateIndex(
                name: "IX_SystemErrorIncidents_Tenant_Fingerprint",
                table: "SystemErrorIncidents",
                columns: new[] { "TenantId", "ErrorFingerprintHash" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_SystemErrorIncidents_ErrorCode",
                table: "SystemErrorIncidents");

            migrationBuilder.DropIndex(
                name: "IX_SystemErrorIncidents_Tenant_Fingerprint",
                table: "SystemErrorIncidents");

            migrationBuilder.AddColumn<string>(
                name: "StackTrace",
                table: "SystemErrorIncidents",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RawPayload",
                table: "SystemErrorIncidents",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.Sql(@"
                UPDATE si
                SET si.StackTrace = d.StackTrace,
                    si.RawPayload = d.RawPayload
                FROM SystemErrorIncidents si
                JOIN IncidentDetailPayloads d ON d.IncidentId = si.IncidentId;
            ");

            migrationBuilder.DropTable(
                name: "IncidentDetailPayloads");

            migrationBuilder.DropColumn(
                name: "ErrorFingerprintHash",
                table: "SystemErrorIncidents");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "SystemErrorIncidents");

            migrationBuilder.DropColumn(
                name: "OccurrencesCount",
                table: "SystemErrorIncidents");

            migrationBuilder.DropColumn(
                name: "LastSeenAt",
                table: "SystemErrorIncidents");

            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "SystemErrorIncidents");

            migrationBuilder.DropColumn(
                name: "CreatedBy",
                table: "SystemErrorIncidents");

            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                table: "SystemErrorIncidents");

            migrationBuilder.DropColumn(
                name: "UpdatedBy",
                table: "SystemErrorIncidents");

            migrationBuilder.DropColumn(
                name: "RowVersion",
                table: "SystemErrorIncidents");

            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "ErrorCatalogs");

            migrationBuilder.DropColumn(
                name: "CreatedAt",
                table: "ErrorCatalogs");

            migrationBuilder.DropColumn(
                name: "CreatedBy",
                table: "ErrorCatalogs");

            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                table: "ErrorCatalogs");

            migrationBuilder.DropColumn(
                name: "UpdatedBy",
                table: "ErrorCatalogs");

            migrationBuilder.DropColumn(
                name: "RowVersion",
                table: "ErrorCatalogs");

            migrationBuilder.AlterColumn<int>(
                name: "SeverityLevel",
                table: "ErrorCatalogs",
                type: "int",
                nullable: false,
                oldClrType: typeof(byte),
                oldType: "tinyint");

            migrationBuilder.DropColumn(
                name: "CreatedBy",
                table: "BugReports");

            migrationBuilder.DropColumn(
                name: "RowVersion",
                table: "BugReports");

            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "BugReports");

            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                table: "BugReports");

            migrationBuilder.DropColumn(
                name: "UpdatedBy",
                table: "BugReports");

            migrationBuilder.AlterColumn<string>(
                name: "Title",
                table: "BugReports",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(200)",
                oldMaxLength: 200);

            migrationBuilder.AlterColumn<string>(
                name: "SystemModule",
                table: "BugReports",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(100)",
                oldMaxLength: 100);

            migrationBuilder.AlterColumn<int>(
                name: "Status",
                table: "BugReports",
                type: "int",
                nullable: false,
                oldClrType: typeof(byte),
                oldType: "tinyint");

            migrationBuilder.AlterColumn<int>(
                name: "Priority",
                table: "BugReports",
                type: "int",
                nullable: false,
                oldClrType: typeof(byte),
                oldType: "tinyint");
        }
    }
}
