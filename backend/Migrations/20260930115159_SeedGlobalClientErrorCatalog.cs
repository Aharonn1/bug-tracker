using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace MyBackendApi.Migrations
{
    /// <inheritdoc />
    public partial class SeedGlobalClientErrorCatalog : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.InsertData(
                table: "ErrorCatalogs",
                columns: new[] { "ErrorCode", "Category", "CreatedAt", "CreatedBy", "HebrewDescription", "ResolutionPlaybook", "RowVersion", "SeverityLevel", "Subsystem", "TenantId", "UpdatedAt", "UpdatedBy" },
                values: new object[,]
                {
                    { "CLIENT_UNHANDLED_ERROR", "Client-Side/Runtime", new DateTime(2026, 9, 30, 0, 0, 0, 0, DateTimeKind.Utc), null, "שגיאת JavaScript גלובלית בלתי צפויה בדפדפן הלקוח, מחוץ למחזור ה-render של React (למשל בתוך event handler או setTimeout) - מזוהה אוטומטית", "1. לבדוק את ה-Stack Trace ואת השורה המדויקת שבה קרתה השגיאה. 2. לשחזר את הפעולה שהובילה לשגיאה לפי RawPayload (URL, User Agent). 3. אם זו שגיאה חוזרת, לשקול הוספת בדיקת תקינות (guard clause) בקוד הרלוונטי.", null, (byte)3, "WebClient", "", null, null },
                    { "CLIENT_UNHANDLED_REJECTION", "Client-Side/Runtime", new DateTime(2026, 9, 30, 0, 0, 0, 0, DateTimeKind.Utc), null, "הבטחה (Promise) בקוד הלקוח נדחתה בלי טיפול (.catch) - לרוב מעיד על קריאת API או פעולה אסינכרונית שנכשלה בלי הודעה למשתמש", "1. לבדוק את הודעת השגיאה ואת ה-Stack Trace אם קיים. 2. לאתר את הקריאה האסינכרונית החסרה בטיפול (fetch/Promise) ולהוסיף .catch מתאים. 3. לוודא שהמשתמש מקבל הודעת שגיאה ברורה במקום שהאפליקציה פשוט 'נתקעת' בשקט.", null, (byte)3, "WebClient", "", null, null }
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "ErrorCatalogs",
                keyColumn: "ErrorCode",
                keyValue: "CLIENT_UNHANDLED_ERROR");

            migrationBuilder.DeleteData(
                table: "ErrorCatalogs",
                keyColumn: "ErrorCode",
                keyValue: "CLIENT_UNHANDLED_REJECTION");
        }
    }
}
