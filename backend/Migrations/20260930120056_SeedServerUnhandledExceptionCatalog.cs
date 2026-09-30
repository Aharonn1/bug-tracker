using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MyBackendApi.Migrations
{
    /// <inheritdoc />
    public partial class SeedServerUnhandledExceptionCatalog : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.InsertData(
                table: "ErrorCatalogs",
                columns: new[] { "ErrorCode", "Category", "CreatedAt", "CreatedBy", "HebrewDescription", "ResolutionPlaybook", "RowVersion", "SeverityLevel", "Subsystem", "TenantId", "UpdatedAt", "UpdatedBy" },
                values: new object[] { "SERVER_UNHANDLED_EXCEPTION", "Server-Side/Runtime", new DateTime(2026, 9, 30, 0, 0, 0, 0, DateTimeKind.Utc), null, "חריגה בלתי צפויה נלכדה ב-GlobalExceptionHandler בשרת - קוד השתבש בדרך שלא טופלה מראש (לא NotFound/ולידציה/קונפליקט ידוע). מזוהה אוטומטית מכל בקשת API", "1. לבדוק את ה-Stack Trace המלא ואת סוג החריגה המדויק (RawPayload כולל את הנתיב והמתודה של הבקשה). 2. לבדוק בלוגים של Application Insights את אותו חלון זמן לפי IncidentId. 3. לתקן את הקוד ולהוסיף טיפול חריגה ספציפי ב-GlobalExceptionHandler אם מדובר בתרחיש שחוזר ועדיין ראוי ל-400/404 ולא ל-500.", null, (byte)4, "BackendApi", "", null, null });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "ErrorCatalogs",
                keyColumn: "ErrorCode",
                keyValue: "SERVER_UNHANDLED_EXCEPTION");
        }
    }
}
