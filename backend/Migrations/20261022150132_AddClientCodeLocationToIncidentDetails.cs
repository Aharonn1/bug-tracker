using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MyBackendApi.Migrations
{
    /// <inheritdoc />
    public partial class AddClientCodeLocationToIncidentDetails : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ClientCodeLocationFilePath",
                table: "IncidentDetailPayloads",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ClientCodeLocationLine",
                table: "IncidentDetailPayloads",
                type: "int",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ClientCodeLocationFilePath",
                table: "IncidentDetailPayloads");

            migrationBuilder.DropColumn(
                name: "ClientCodeLocationLine",
                table: "IncidentDetailPayloads");
        }
    }
}
