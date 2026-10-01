using Microsoft.Data.SqlClient;

namespace MyBackendApi.Services.Diagnostics;

public static class DatabaseExceptionDetector
{
    // SqlException ישירה, או עטופה ע"י RetryLimitExceededException אחרי
    // שמדיניות ה-Retry של EF Core (EnableRetryOnFailure) כבר מיצתה את הניסיונות
    public static bool IsDatabaseConnectivityException(Exception exception) =>
        exception is SqlException
        || exception.InnerException is SqlException
        || exception.GetType().Name == "RetryLimitExceededException";
}
