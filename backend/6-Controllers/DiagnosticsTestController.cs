using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MyBackendApi.Controllers;

// בקר זמני לבדיקה בלבד - חריגה קריטית שאינה קשורה ל-DB, לבדיקת SERVER_UNHANDLED_EXCEPTION
// יוסר מיד אחרי הבדיקה
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DiagnosticsTestController : ControllerBase
{
    [HttpPost("trigger-critical-error")]
    public IActionResult TriggerCriticalError()
    {
        throw new InvalidOperationException("בדיקה יזומה: חריגה קריטית שאינה קשורה ל-DB, לבדיקת שיוך למשתמש");
    }
}
