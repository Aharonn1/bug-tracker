using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MyBackendApi.Migrations
{
    /// <inheritdoc />
    public partial class AddResolutionNotesAndDeploymentRecords : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ResolutionNotes",
                table: "SystemErrorIncidents",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "DeploymentRecords",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Component = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    CommitSha = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    DeployedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DeploymentRecords", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_DeploymentRecords_Component_DeployedAt",
                table: "DeploymentRecords",
                columns: new[] { "Component", "DeployedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DeploymentRecords");

            migrationBuilder.DropColumn(
                name: "ResolutionNotes",
                table: "SystemErrorIncidents");
        }
    }
}
