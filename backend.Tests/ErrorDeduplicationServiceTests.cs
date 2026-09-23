using MyBackendApi.Services.Deduplication;
using Xunit;

namespace MyBackendApi.Tests;

public class ErrorDeduplicationServiceTests
{
    private readonly ErrorDeduplicationService _service = new();

    [Fact]
    public void SameInputs_ProduceSameFingerprint()
    {
        var a = _service.GenerateFingerprint("NET_MISH_TIMEOUT", "Gateway timeout", "at Foo.Bar()");
        var b = _service.GenerateFingerprint("NET_MISH_TIMEOUT", "Gateway timeout", "at Foo.Bar()");

        Assert.Equal(a, b);
    }

    [Fact]
    public void DifferentErrorCode_ProducesDifferentFingerprint()
    {
        var a = _service.GenerateFingerprint("NET_MISH_TIMEOUT", "same message", "same stack");
        var b = _service.GenerateFingerprint("ECA_SEIZURE_FAIL", "same message", "same stack");

        Assert.NotEqual(a, b);
    }

    [Fact]
    public void NullStackTrace_DoesNotThrow()
    {
        var fingerprint = _service.GenerateFingerprint("NET_MISH_TIMEOUT", "message", null);

        Assert.False(string.IsNullOrEmpty(fingerprint));
    }

    [Fact]
    public void StackTraceLongerThan150Chars_IsTruncatedConsistently()
    {
        var longStack = new string('x', 500);
        var slightlyDifferentAfter150 = new string('x', 150) + new string('y', 350);

        var a = _service.GenerateFingerprint("CODE", "message", longStack);
        var b = _service.GenerateFingerprint("CODE", "message", slightlyDifferentAfter150);

        // רק 150 התווים הראשונים של ה-StackTrace נכנסים לטביעת האצבע,
        // אז שני stack traces שזהים ב-150 התווים הראשונים אמורים לתת אותה טביעת אצבע
        Assert.Equal(a, b);
    }

    [Fact]
    public void Fingerprint_IsValidHexString()
    {
        var fingerprint = _service.GenerateFingerprint("CODE", "message", "stack");

        Assert.Matches("^[0-9A-F]+$", fingerprint);
    }
}
