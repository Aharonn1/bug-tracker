using MyBackendApi.Models.DTOs.Telemetry;

namespace MyBackendApi.Services.Core;

public class TelemetryAnalysisService
{
    public TelemetryDiagnosticReport AnalyzeClientMetrics(ClientTelemetryProbeDto dto)
    {
        // 1. זיהוי ניתוקים בפועל (Packet Loss) - עדיפות עליונה, כי זה חמור מאיטיות רגילה
        // ומקורו כמעט תמיד בספק האינטרנט (ISP), לא במחשב או בראוטר המקומי
        if (dto.PingAttempts > 0 && dto.PingFailures > 0)
        {
            var lossPercent = (int)Math.Round(100.0 * dto.PingFailures / dto.PingAttempts);
            return new TelemetryDiagnosticReport(
                StatusColor: "Red",
                SummaryTitle: "זוהו ניתוקים חוזרים בחיבור האינטרנט",
                ActionableRecommendation: "מתוך " + dto.PingAttempts + " ניסיונות תקשורת, " + dto.PingFailures + " נכשלו לגמרי (כ-" + lossPercent + "% אובדן חבילות). זו לרוב בעיה אצל ספק האינטרנט (ISP) ולא רק איטיות רגילה - מומלץ לבדוק את קו האינטרנט או לפנות לספק.",
                IsIssueLocalToClient: true,
                IsFixableByRestart: false
            );
        }

        // 2. זיהוי ניתוק או שיהוי חריג ברשת - הסף מחמיר (100ms) כי המערכת שלנו
        // עתירת נתונים ודורשת חיבור מהיר ויציב, לא רק גלישה רגילה
        if (dto.LatencyMs > 100 || dto.EffectiveConnectionType == "2g" || dto.EffectiveConnectionType == "3g")
        {
            return new TelemetryDiagnosticReport(
                StatusColor: "Red",
                SummaryTitle: "חיבור האינטרנט בעמדה זו איטי או מקוטע",
                ActionableRecommendation: "זוהתה תעבורת רשת לקויה במשרד (זמן תגובה: " + (int)dto.LatencyMs + "ms, מעל הסף של 100ms הנדרש למערכת). מומלץ לבדוק את חיבור ה-Wi-Fi/כבל הרשת או להפעיל מחדש את הראוטר.",
                IsIssueLocalToClient: true,
                IsFixableByRestart: true
            );
        }

        // 3. זיהוי רשת שעובדת אך איטית מהרצוי (30-100ms) - עדיין תפקודית,
        // אך מתחת לרמה שהמערכת שלנו בנויה לעבוד בה בצורה חלקה
        if (dto.LatencyMs >= 30)
        {
            return new TelemetryDiagnosticReport(
                StatusColor: "Yellow",
                SummaryTitle: "זמן התגובה בעמדה זו איטי מהרצוי",
                ActionableRecommendation: "זמן התגובה לשרת (" + (int)dto.LatencyMs + "ms) גבוה מהרף המומלץ (30ms) לעבודה חלקה במערכת. זה עדיין פועל, אך עלול להרגיש איטי. מומלץ לבדוק את חוזק חיבור האינטרנט במשרד.",
                IsIssueLocalToClient: true,
                IsFixableByRestart: true
            );
        }

        // 4. זיהוי מחנק מעבד/זיכרון בדפדפן (Event Loop Lag גבוה)
        if (dto.ExecutionLagMs > 150)
        {
            return new TelemetryDiagnosticReport(
                StatusColor: "Yellow",
                SummaryTitle: "עומס כבד זוהה במחשב המקומי",
                ActionableRecommendation: "מעבד המחשב מגיב באיטיות חריגה. מומלץ לסגור לשוניות מיותרות בדפדפן ותוכנות פתוחות ברקע.",
                IsIssueLocalToClient: true,
                IsFixableByRestart: true
            );
        }

        // 5. זיהוי גימגום תצוגה (Frame Jank) - סימן אופייני לחיבור שולחן עבודה מרוחק איטי (RDP/Citrix)
        if (dto.FrameJankMs is > 100)
        {
            return new TelemetryDiagnosticReport(
                StatusColor: "Yellow",
                SummaryTitle: "זוהה עיכוב בתצוגה בעמדה זו",
                ActionableRecommendation: "המסך מגיב באיטיות חריגה (עיכוב פריים: " + (int)dto.FrameJankMs.Value + "ms). אם אתה מתחבר דרך שולחן עבודה מרוחק (RDP/Citrix) או VPN, ייתכן שהחיבור למחשב המרוחק הוא הגורם - כדאי לבדוק את איכות החיבור המרוחק.",
                IsIssueLocalToClient: true,
                IsFixableByRestart: true
            );
        }

        // 6. זיהוי חולשת חומרה מבנית - הסבר קבוע ולא רגעי, לכן לא ניתן לפתרון בהפעלה מחדש
        if (dto.HardwareConcurrency is <= 2 || dto.DeviceMemoryGb is <= 2)
        {
            return new TelemetryDiagnosticReport(
                StatusColor: "Yellow",
                SummaryTitle: "עמדה זו חלשה מבחינה חומרתית",
                ActionableRecommendation: "המחשב בעמדה זו מוגדר עם משאבי זיכרון/מעבד מוגבלים, מה שגורם לאיטיות קבועה ולא רק רגעית. מומלץ לפנות לאחראי ה-IT במשרד לבדיקת שדרוג העמדה.",
                IsIssueLocalToClient: true,
                IsFixableByRestart: false
            );
        }

        // 7. תקין
        return new TelemetryDiagnosticReport(
            StatusColor: "Green",
            SummaryTitle: "סביבת העבודה והרשת תקינות לחלוטין",
            ActionableRecommendation: "כל המדדים בעמדה שלך ירוקים (זמן תגובה לשרת: " + (int)dto.LatencyMs + "ms, עומס מעבד: " + (int)dto.ExecutionLagMs + "ms). המערכת מוכנה לעבודה מהירה.",
            IsIssueLocalToClient: false,
            IsFixableByRestart: false
        );
    }
}