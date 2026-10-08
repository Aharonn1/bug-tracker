using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MyBackendApi.Migrations
{
    /// <inheritdoc />
    public partial class AddPerTenantEmailUniqueIndexAndFingerprintUnique : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Users_Email",
                table: "Users");

            migrationBuilder.DropIndex(
                name: "IX_SystemErrorIncidents_Tenant_Fingerprint",
                table: "SystemErrorIncidents");

            migrationBuilder.AlterColumn<string>(
                name: "TenantId",
                table: "Users",
                type: "nvarchar(450)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.CreateIndex(
                name: "IX_Users_TenantId_Email",
                table: "Users",
                columns: new[] { "TenantId", "Email" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SystemErrorIncidents_Tenant_Fingerprint",
                table: "SystemErrorIncidents",
                columns: new[] { "TenantId", "ErrorFingerprintHash" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Users_TenantId_Email",
                table: "Users");

            migrationBuilder.DropIndex(
                name: "IX_SystemErrorIncidents_Tenant_Fingerprint",
                table: "SystemErrorIncidents");

            migrationBuilder.AlterColumn<string>(
                name: "TenantId",
                table: "Users",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(450)");

            migrationBuilder.CreateIndex(
                name: "IX_Users_Email",
                table: "Users",
                column: "Email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SystemErrorIncidents_Tenant_Fingerprint",
                table: "SystemErrorIncidents",
                columns: new[] { "TenantId", "ErrorFingerprintHash" });
        }
    }
}
