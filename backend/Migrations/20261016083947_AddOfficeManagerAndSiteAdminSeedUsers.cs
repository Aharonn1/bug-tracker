using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace MyBackendApi.Migrations
{
    /// <inheritdoc />
    public partial class AddOfficeManagerAndSiteAdminSeedUsers : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 1,
                column: "Role",
                value: (byte)3);

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 2,
                column: "Role",
                value: (byte)2);

            migrationBuilder.InsertData(
                table: "Users",
                columns: new[] { "Id", "CreatedAt", "CreatedBy", "Email", "FailedLoginAttempts", "FullName", "IsActive", "LockedOutUntil", "PasswordHash", "Role", "RowVersion", "TenantId", "UpdatedAt", "UpdatedBy" },
                values: new object[,]
                {
                    { 5, new DateTime(2026, 10, 16, 0, 0, 0, 0, DateTimeKind.Utc), null, "dana.cohengold@cohen-gold-law.co.il", 0, "דנה כהן-גולד", true, null, "AQAAAAIAAYagAAAAEC1Wb2k1xvIBk3h4pb0eY5gJy8M01dZhT4WIsY+Wl1WfPZBZi+jUD6S7nz0/Ml9YVg==", (byte)2, null, "cohen-gold-law", null, null },
                    { 6, new DateTime(2026, 10, 16, 0, 0, 0, 0, DateTimeKind.Utc), null, "yoav.shapira@cohen-gold-law.co.il", 0, "יואב שפירא", true, null, "AQAAAAIAAYagAAAAEC1Wb2k1xvIBk3h4pb0eY5gJy8M01dZhT4WIsY+Wl1WfPZBZi+jUD6S7nz0/Ml9YVg==", (byte)1, null, "cohen-gold-law", null, null },
                    { 7, new DateTime(2026, 10, 16, 0, 0, 0, 0, DateTimeKind.Utc), null, "michal.avraham@cohen-gold-law.co.il", 0, "מיכל אברהם", true, null, "AQAAAAIAAYagAAAAEC1Wb2k1xvIBk3h4pb0eY5gJy8M01dZhT4WIsY+Wl1WfPZBZi+jUD6S7nz0/Ml9YVg==", (byte)1, null, "cohen-gold-law", null, null },
                    { 8, new DateTime(2026, 10, 16, 0, 0, 0, 0, DateTimeKind.Utc), null, "ron.friedman@cohen-gold-law.co.il", 0, "רון פרידמן", true, null, "AQAAAAIAAYagAAAAEC1Wb2k1xvIBk3h4pb0eY5gJy8M01dZhT4WIsY+Wl1WfPZBZi+jUD6S7nz0/Ml9YVg==", (byte)1, null, "cohen-gold-law", null, null },
                    { 9, new DateTime(2026, 10, 16, 0, 0, 0, 0, DateTimeKind.Utc), null, "tal.nachmias@cohen-gold-law.co.il", 0, "טל נחמיאס", true, null, "AQAAAAIAAYagAAAAEC1Wb2k1xvIBk3h4pb0eY5gJy8M01dZhT4WIsY+Wl1WfPZBZi+jUD6S7nz0/Ml9YVg==", (byte)1, null, "cohen-gold-law", null, null },
                    { 10, new DateTime(2026, 10, 16, 0, 0, 0, 0, DateTimeKind.Utc), null, "omer.mizrahi@mizrahi-partners.co.il", 0, "עומר מזרחי", true, null, "AQAAAAIAAYagAAAAEC1Wb2k1xvIBk3h4pb0eY5gJy8M01dZhT4WIsY+Wl1WfPZBZi+jUD6S7nz0/Ml9YVg==", (byte)2, null, "mizrahi-partners", null, null },
                    { 11, new DateTime(2026, 10, 16, 0, 0, 0, 0, DateTimeKind.Utc), null, "liat.gabay@mizrahi-partners.co.il", 0, "ליאת גבאי", true, null, "AQAAAAIAAYagAAAAEC1Wb2k1xvIBk3h4pb0eY5gJy8M01dZhT4WIsY+Wl1WfPZBZi+jUD6S7nz0/Ml9YVg==", (byte)1, null, "mizrahi-partners", null, null },
                    { 12, new DateTime(2026, 10, 16, 0, 0, 0, 0, DateTimeKind.Utc), null, "asaf.biton@mizrahi-partners.co.il", 0, "אסף ביטון", true, null, "AQAAAAIAAYagAAAAEC1Wb2k1xvIBk3h4pb0eY5gJy8M01dZhT4WIsY+Wl1WfPZBZi+jUD6S7nz0/Ml9YVg==", (byte)1, null, "mizrahi-partners", null, null },
                    { 13, new DateTime(2026, 10, 16, 0, 0, 0, 0, DateTimeKind.Utc), null, "hadar.shalom@mizrahi-partners.co.il", 0, "הדר שלום", true, null, "AQAAAAIAAYagAAAAEC1Wb2k1xvIBk3h4pb0eY5gJy8M01dZhT4WIsY+Wl1WfPZBZi+jUD6S7nz0/Ml9YVg==", (byte)1, null, "mizrahi-partners", null, null },
                    { 14, new DateTime(2026, 10, 16, 0, 0, 0, 0, DateTimeKind.Utc), null, "gil.ohayon@mizrahi-partners.co.il", 0, "גיל אוחיון", true, null, "AQAAAAIAAYagAAAAEC1Wb2k1xvIBk3h4pb0eY5gJy8M01dZhT4WIsY+Wl1WfPZBZi+jUD6S7nz0/Ml9YVg==", (byte)1, null, "mizrahi-partners", null, null },
                    { 15, new DateTime(2026, 10, 16, 0, 0, 0, 0, DateTimeKind.Utc), null, "rotem.benami@ben-ami-legal.co.il", 0, "רותם בן-עמי", true, null, "AQAAAAIAAYagAAAAEC1Wb2k1xvIBk3h4pb0eY5gJy8M01dZhT4WIsY+Wl1WfPZBZi+jUD6S7nz0/Ml9YVg==", (byte)2, null, "ben-ami-legal", null, null },
                    { 16, new DateTime(2026, 10, 16, 0, 0, 0, 0, DateTimeKind.Utc), null, "shahar.levin@ben-ami-legal.co.il", 0, "שחר לוין", true, null, "AQAAAAIAAYagAAAAEC1Wb2k1xvIBk3h4pb0eY5gJy8M01dZhT4WIsY+Wl1WfPZBZi+jUD6S7nz0/Ml9YVg==", (byte)1, null, "ben-ami-legal", null, null },
                    { 17, new DateTime(2026, 10, 16, 0, 0, 0, 0, DateTimeKind.Utc), null, "neta.israeli@ben-ami-legal.co.il", 0, "נטע ישראלי", true, null, "AQAAAAIAAYagAAAAEC1Wb2k1xvIBk3h4pb0eY5gJy8M01dZhT4WIsY+Wl1WfPZBZi+jUD6S7nz0/Ml9YVg==", (byte)1, null, "ben-ami-legal", null, null },
                    { 18, new DateTime(2026, 10, 16, 0, 0, 0, 0, DateTimeKind.Utc), null, "or.zuckerman@ben-ami-legal.co.il", 0, "אור צוקרמן", true, null, "AQAAAAIAAYagAAAAEC1Wb2k1xvIBk3h4pb0eY5gJy8M01dZhT4WIsY+Wl1WfPZBZi+jUD6S7nz0/Ml9YVg==", (byte)1, null, "ben-ami-legal", null, null },
                    { 19, new DateTime(2026, 10, 16, 0, 0, 0, 0, DateTimeKind.Utc), null, "sapir.hadad@ben-ami-legal.co.il", 0, "ספיר חדד", true, null, "AQAAAAIAAYagAAAAEC1Wb2k1xvIBk3h4pb0eY5gJy8M01dZhT4WIsY+Wl1WfPZBZi+jUD6S7nz0/Ml9YVg==", (byte)1, null, "ben-ami-legal", null, null }
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 5);

            migrationBuilder.DeleteData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 6);

            migrationBuilder.DeleteData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 7);

            migrationBuilder.DeleteData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 8);

            migrationBuilder.DeleteData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 9);

            migrationBuilder.DeleteData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 10);

            migrationBuilder.DeleteData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 11);

            migrationBuilder.DeleteData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 12);

            migrationBuilder.DeleteData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 13);

            migrationBuilder.DeleteData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 14);

            migrationBuilder.DeleteData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 15);

            migrationBuilder.DeleteData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 16);

            migrationBuilder.DeleteData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 17);

            migrationBuilder.DeleteData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 18);

            migrationBuilder.DeleteData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 19);

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 1,
                column: "Role",
                value: (byte)2);

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 2,
                column: "Role",
                value: (byte)1);
        }
    }
}
