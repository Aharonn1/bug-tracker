using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MyBackendApi.Migrations
{
    /// <inheritdoc />
    public partial class SeedDatabaseUnavailableCatalog : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.InsertData(
                table: "ErrorCatalogs",
                columns: new[] { "ErrorCode", "Category", "CreatedAt", "CreatedBy", "HebrewDescription", "ResolutionPlaybook", "RowVersion", "SeverityLevel", "Subsystem", "TenantId", "UpdatedAt", "UpdatedBy" },
                values: new object[] { "SERVER_DATABASE_UNAVAILABLE", "Server-Side/Database", new DateTime(2026, 9, 30, 0, 0, 0, 0, DateTimeKind.Utc), null, "בסיס הנתונים לא היה נגיש לשרת (חריגת SQL/timeout בחיבור) - נרשם זמנית בזיכרון ונשמר כתקרית קבועה ברגע שהחיבור חזר", "1. לבדוק ב-Azure Portal את מצב שרת ה-SQL (Firewall, DTU/vCore throttling, תחזוקה מתוכננת). 2. לבדוק את RawPayload לזמן המדויק ואת הנתיב שנכשל. 3. אם זה חוזר, לשקול Connection Pooling/Retry policy אגרסיביים יותר או שדרוג tier.", null, (byte)4, "SqlServer", "", null, null });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "ErrorCatalogs",
                keyColumn: "ErrorCode",
                keyValue: "SERVER_DATABASE_UNAVAILABLE");
        }
    }
}
