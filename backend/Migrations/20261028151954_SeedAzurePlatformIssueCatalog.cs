using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MyBackendApi.Migrations
{
    /// <inheritdoc />
    public partial class SeedAzurePlatformIssueCatalog : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.InsertData(
                table: "ErrorCatalogs",
                columns: new[] { "ErrorCode", "Category", "CreatedAt", "CreatedBy", "HebrewDescription", "ResolutionPlaybook", "RowVersion", "SeverityLevel", "Subsystem", "TenantId", "UpdatedAt", "UpdatedBy" },
                values: new object[] { "AZURE_PLATFORM_ISSUE", "Infrastructure/Azure", new DateTime(2026, 10, 28, 0, 0, 0, 0, DateTimeKind.Utc), null, "מיקרוסופט הכריזה על תקלה פעילה (Service Issue) ב-Azure, ברמת ה-subscription/אזור שלנו - לא נגזר ממדדים שלנו, זו הכרזה רשמית. נוצר אוטומטית דרך webhook של Azure Monitor Alert, לא דיווח ידני.", "1. לבדוק את RawPayload לפרטי האירוע המלאים (שירות/אזור מושפעים, סטטוס). 2. לבדוק בכרטיס 'Azure Service Health' בדשבורד התשתית את הפירוט העדכני. 3. זו תקלת תשתית חיצונית - אין מה לתקן בקוד שלנו, רק לעקוב אחרי סטטוס הפתרון של מיקרוסופט ולעדכן לקוחות במידת הצורך.", null, (byte)4, "Azure Platform", "", null, null });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "ErrorCatalogs",
                keyColumn: "ErrorCode",
                keyValue: "AZURE_PLATFORM_ISSUE");
        }
    }
}
