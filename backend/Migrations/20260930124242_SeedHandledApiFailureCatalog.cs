using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MyBackendApi.Migrations
{
    /// <inheritdoc />
    public partial class SeedHandledApiFailureCatalog : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.InsertData(
                table: "ErrorCatalogs",
                columns: new[] { "ErrorCode", "Category", "CreatedAt", "CreatedBy", "HebrewDescription", "ResolutionPlaybook", "RowVersion", "SeverityLevel", "Subsystem", "TenantId", "UpdatedAt", "UpdatedBy" },
                values: new object[] { "CLIENT_HANDLED_API_FAILURE", "Client-Side/API", new DateTime(2026, 9, 30, 0, 0, 0, 0, DateTimeKind.Utc), null, "קריאת API נכשלה אך טופלה בצורה מבוקרת בממשק (המשתמש רואה הודעת שגיאה ידידותית ולא קריסה) - נשמר כדי לעקוב אחרי כשלים חוזרים שהלקוח לא בהכרח מדווח עליהם", "1. לבדוק את הודעת השגיאה ואת ה-URL שנקרא (RawPayload). 2. אם זו תקרית חוזרת מאותו endpoint, לבדוק את הלוגים בצד השרת לאותו חלון זמן. 3. לוודא שזו לא בעיית רשת זמנית של הלקוח בלבד לפני שפותחים חקירה מעמיקה.", null, (byte)2, "WebClient", "", null, null });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "ErrorCatalogs",
                keyColumn: "ErrorCode",
                keyValue: "CLIENT_HANDLED_API_FAILURE");
        }
    }
}
