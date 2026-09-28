using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MyBackendApi.Migrations
{
    /// <inheritdoc />
    public partial class SeedClientNetworkDegradedCatalog : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.InsertData(
                table: "ErrorCatalogs",
                columns: new[] { "ErrorCode", "Category", "CreatedAt", "CreatedBy", "HebrewDescription", "ResolutionPlaybook", "RowVersion", "SeverityLevel", "Subsystem", "TenantId", "UpdatedAt", "UpdatedBy" },
                values: new object[] { "CLIENT_NETWORK_DEGRADED", "Client-Side/Network", new DateTime(2026, 9, 28, 0, 0, 0, 0, DateTimeKind.Utc), null, "זוהתה האטה או אובדן חבילות ברשת בעמדת הלקוח (latency גבוה/ping נכשל) - מזוהה אוטומטית ע\"י בדיקת קישוריות בדפדפן", "1. לבדוק את יציבות חיבור הרשת (Wi-Fi/כבל) בעמדת הלקוח. 2. להפעיל מחדש את הנתב/המחשב. 3. אם ממשיך, לבדוק תחזוקה מתוכננת אצל ספק האינטרנט או VPN פעיל שמאט את התעבורה.", null, (byte)2, "WebClient", "", null, null });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "ErrorCatalogs",
                keyColumn: "ErrorCode",
                keyValue: "CLIENT_NETWORK_DEGRADED");
        }
    }
}
