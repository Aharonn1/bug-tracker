using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MyBackendApi.Migrations
{
    /// <inheritdoc />
    public partial class AddAzureAlertOccurrences : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AzureAlertOccurrences",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    TenantId = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    AlertType = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    FiredAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AzureAlertOccurrences", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AzureAlertOccurrences_TenantId_FiredAt",
                table: "AzureAlertOccurrences",
                columns: new[] { "TenantId", "FiredAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AzureAlertOccurrences");
        }
    }
}
