using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MyBackendApi.Controllers;

// בקר זמני לבדיקה בלבד - מוודא בזמן אמת שחריגה בלתי צפויה בסביבה החיה מגיעה
// עד ל-SERVER_UNHANDLED_EXCEPTION. יוסר מיד אחרי הבדיקה ולא יישאר ב-production
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DiagnosticsTestController : ControllerBase
{
    [HttpPost("trigger-test-exception")]
    public IActionResult TriggerTestException()
    {
        throw new InvalidCastException("בדיקה יזומה בסביבה החיה: זו חריגה מכוונת לבדיקת מעקב SERVER_UNHANDLED_EXCEPTION");
    }
}
