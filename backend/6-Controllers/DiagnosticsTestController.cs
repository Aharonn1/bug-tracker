using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MyBackendApi.Controllers;

// בקר זמני לבדיקה בלבד - חריגה קריטית גנרית (לא אחד הסוגים שה-GlobalExceptionHandler
// כבר ממפה ספציפית), שאינה קשורה ל-DB, לבדיקת SERVER_UNHANDLED_EXCEPTION
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DiagnosticsTestController : ControllerBase
{
    [HttpPost("trigger-critical-error")]
    public IActionResult TriggerCriticalError()
    {
        throw new Exception("בדיקה יזומה: חריגה קריטית גנרית שאינה קשורה ל-DB, לבדיקת שיוך למשתמש");
    }
}
