using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace MyBackendApi.Migrations
{
    /// <inheritdoc />
    public partial class AddUsersWithSeedData : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Users",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    FullName = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    Email = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: false),
                    PasswordHash = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Role = table.Column<byte>(type: "tinyint", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    TenantId = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    RowVersion = table.Column<byte[]>(type: "varbinary(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Users", x => x.Id);
                });

            migrationBuilder.InsertData(
                table: "Users",
                columns: new[] { "Id", "CreatedAt", "CreatedBy", "Email", "FullName", "IsActive", "PasswordHash", "Role", "RowVersion", "TenantId", "UpdatedAt", "UpdatedBy" },
                values: new object[,]
                {
                    { 1, new DateTime(2026, 9, 28, 0, 0, 0, 0, DateTimeKind.Utc), null, "aharon.halevy@lawfirm.co.il", "אהרון הלוי", true, "AQAAAAIAAYagAAAAEAt+3mQSMdu/YjNwFNRAoKQPzrPHCiBy6jbcVrU/Dh2CdHbUZKP8k1nl8aHyS/tNlw==", (byte)2, null, "default-tenant", null, null },
                    { 2, new DateTime(2026, 9, 28, 0, 0, 0, 0, DateTimeKind.Utc), null, "noa.cohen@lawfirm.co.il", "נועה כהן", true, "AQAAAAIAAYagAAAAEGOk1i23I7wFdF4/JghwnSBqHBpyq82LGeRAMWySOjMG87NM176R89AIqj8OzBaOxg==", (byte)1, null, "default-tenant", null, null },
                    { 3, new DateTime(2026, 9, 28, 0, 0, 0, 0, DateTimeKind.Utc), null, "itai.mizrahi@lawfirm.co.il", "איתי מזרחי", true, "AQAAAAIAAYagAAAAEBF1/j0+Myd5iGA4pjqi9VcT8rLEMolpP1ufT69h/B9Lol3vsyZOG+z8Kxa4sMOf2Q==", (byte)1, null, "default-tenant", null, null },
                    { 4, new DateTime(2026, 9, 28, 0, 0, 0, 0, DateTimeKind.Utc), null, "shira.bendavid@lawfirm.co.il", "שירה בן-דוד", true, "AQAAAAIAAYagAAAAEO/Hir2rnamThvop9sj1mf/9ICH3TZzuEariJUgHemP9tg+QdS2lTkAjlzVW2UmZDQ==", (byte)1, null, "default-tenant", null, null }
                });

            migrationBuilder.CreateIndex(
                name: "IX_Users_Email",
                table: "Users",
                column: "Email",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Users");
        }
    }
}
