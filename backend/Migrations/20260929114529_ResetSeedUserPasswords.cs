using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MyBackendApi.Migrations
{
    /// <inheritdoc />
    public partial class ResetSeedUserPasswords : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 1,
                column: "PasswordHash",
                value: "AQAAAAIAAYagAAAAEC1Wb2k1xvIBk3h4pb0eY5gJy8M01dZhT4WIsY+Wl1WfPZBZi+jUD6S7nz0/Ml9YVg==");

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 2,
                column: "PasswordHash",
                value: "AQAAAAIAAYagAAAAEC1Wb2k1xvIBk3h4pb0eY5gJy8M01dZhT4WIsY+Wl1WfPZBZi+jUD6S7nz0/Ml9YVg==");

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 3,
                column: "PasswordHash",
                value: "AQAAAAIAAYagAAAAEC1Wb2k1xvIBk3h4pb0eY5gJy8M01dZhT4WIsY+Wl1WfPZBZi+jUD6S7nz0/Ml9YVg==");

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 4,
                column: "PasswordHash",
                value: "AQAAAAIAAYagAAAAEC1Wb2k1xvIBk3h4pb0eY5gJy8M01dZhT4WIsY+Wl1WfPZBZi+jUD6S7nz0/Ml9YVg==");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 1,
                column: "PasswordHash",
                value: "AQAAAAIAAYagAAAAEAt+3mQSMdu/YjNwFNRAoKQPzrPHCiBy6jbcVrU/Dh2CdHbUZKP8k1nl8aHyS/tNlw==");

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 2,
                column: "PasswordHash",
                value: "AQAAAAIAAYagAAAAEGOk1i23I7wFdF4/JghwnSBqHBpyq82LGeRAMWySOjMG87NM176R89AIqj8OzBaOxg==");

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 3,
                column: "PasswordHash",
                value: "AQAAAAIAAYagAAAAEBF1/j0+Myd5iGA4pjqi9VcT8rLEMolpP1ufT69h/B9Lol3vsyZOG+z8Kxa4sMOf2Q==");

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 4,
                column: "PasswordHash",
                value: "AQAAAAIAAYagAAAAEO/Hir2rnamThvop9sj1mf/9ICH3TZzuEariJUgHemP9tg+QdS2lTkAjlzVW2UmZDQ==");
        }
    }
}
