using System.Text.RegularExpressions;

namespace MyBackendApi.Services.Core;

// מחלץ את ה-frame הראשון (הקרוב ביותר למקור הזריקה - .NET רושם את ה-frames
// מהפנימי ביותר החוצה) בתוך הקוד שלנו עצמו מתוך stack trace גולמי. הנתיב
// /home/runner/work/bug-tracker/bug-tracker/ הוא נתיב ה-checkout הספציפי
// של GitHub Actions runner בבנייה שלנו - שום דבר אחר (ספריות צד-שלישי,
// .NET Framework עצמו) לא יכול להתאים לתבנית הזו, אז אין צורך בסינון נוסף
// לפי namespace
public static class StackTraceLocationParser
{
    private static readonly Regex FrameRegex = new(
        @"in /home/runner/work/bug-tracker/bug-tracker/(?<path>.+?):line (?<line>\d+)",
        RegexOptions.Compiled);

    public static (string? FilePath, int? Line) ExtractFirstRepoFrame(string? stackTrace)
    {
        if (string.IsNullOrEmpty(stackTrace)) return (null, null);

        var match = FrameRegex.Match(stackTrace);
        if (!match.Success) return (null, null);

        return (match.Groups["path"].Value, int.Parse(match.Groups["line"].Value));
    }
}
