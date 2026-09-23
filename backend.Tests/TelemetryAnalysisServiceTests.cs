using MyBackendApi.Models.DTOs.Telemetry;
using MyBackendApi.Services.Core;
using Xunit;

namespace MyBackendApi.Tests;

public class TelemetryAnalysisServiceTests
{
    private readonly TelemetryAnalysisService _service = new();

    // מדדים תקינים לגמרי - בסיס שכל טסט משנה ממנו רק את מה שרלוונטי לו
    private static ClientTelemetryProbeDto HealthyBaseline => new(
        TenantId: "test-tenant",
        StationId: null,
        LatencyMs: 15,
        EffectiveConnectionType: "4g",
        DownlinkSpeedMbps: 10,
        ExecutionLagMs: 10,
        FrameJankMs: 16,
        HardwareConcurrency: 8,
        DeviceMemoryGb: 16,
        PingAttempts: 15,
        PingFailures: 0,
        UserAgent: "test",
        CurrentUrl: "http://test"
    );

    [Fact]
    public void AllMetricsHealthy_ReturnsGreen()
    {
        var result = _service.AnalyzeClientMetrics(HealthyBaseline);

        Assert.Equal("Green", result.StatusColor);
        Assert.False(result.IsIssueLocalToClient);
        Assert.False(result.IsFixableByRestart);
    }

    [Fact]
    public void PacketLoss_ReturnsRed_EvenWhenLatencyIsFine()
    {
        var dto = HealthyBaseline with { PingFailures = 3 };

        var result = _service.AnalyzeClientMetrics(dto);

        Assert.Equal("Red", result.StatusColor);
        Assert.Contains("ניתוקים", result.SummaryTitle);
        Assert.False(result.IsFixableByRestart);
    }

    [Fact]
    public void PacketLoss_TakesPriorityOver_HighLatency()
    {
        // גם אם גם ה-latency גבוה, הודעת הניתוקים היא שאמורה לנצח (עדיפות #1 בקוד)
        var dto = HealthyBaseline with { PingFailures = 5, LatencyMs = 500 };

        var result = _service.AnalyzeClientMetrics(dto);

        Assert.Contains("ניתוקים", result.SummaryTitle);
    }

    [Theory]
    [InlineData(101)]
    [InlineData(500)]
    public void LatencyAbove100ms_ReturnsRed(double latencyMs)
    {
        var dto = HealthyBaseline with { LatencyMs = latencyMs };

        var result = _service.AnalyzeClientMetrics(dto);

        Assert.Equal("Red", result.StatusColor);
        Assert.True(result.IsFixableByRestart);
    }

    [Theory]
    [InlineData("2g")]
    [InlineData("3g")]
    public void SlowConnectionType_ReturnsRed_RegardlessOfLatency(string connectionType)
    {
        var dto = HealthyBaseline with { EffectiveConnectionType = connectionType, LatencyMs = 5 };

        var result = _service.AnalyzeClientMetrics(dto);

        Assert.Equal("Red", result.StatusColor);
    }

    [Theory]
    [InlineData(30)]
    [InlineData(50)]
    [InlineData(99)]
    public void LatencyBetween30And100ms_ReturnsYellow(double latencyMs)
    {
        var dto = HealthyBaseline with { LatencyMs = latencyMs };

        var result = _service.AnalyzeClientMetrics(dto);

        Assert.Equal("Yellow", result.StatusColor);
        Assert.Contains("איטי מהרצוי", result.SummaryTitle);
    }

    [Fact]
    public void LatencyJustUnder30ms_ReturnsGreen()
    {
        var dto = HealthyBaseline with { LatencyMs = 29.9 };

        var result = _service.AnalyzeClientMetrics(dto);

        Assert.Equal("Green", result.StatusColor);
    }

    [Fact]
    public void HighExecutionLag_ReturnsYellow_CpuOverload()
    {
        var dto = HealthyBaseline with { ExecutionLagMs = 200 };

        var result = _service.AnalyzeClientMetrics(dto);

        Assert.Equal("Yellow", result.StatusColor);
        Assert.Contains("עומס כבד", result.SummaryTitle);
        Assert.True(result.IsFixableByRestart);
    }

    [Fact]
    public void HighFrameJank_ReturnsYellow_DisplayLag()
    {
        var dto = HealthyBaseline with { FrameJankMs = 150 };

        var result = _service.AnalyzeClientMetrics(dto);

        Assert.Equal("Yellow", result.StatusColor);
        Assert.Contains("עיכוב בתצוגה", result.SummaryTitle);
    }

    [Theory]
    [InlineData(1)]
    [InlineData(2)]
    public void WeakCpuCoreCount_ReturnsYellow_NotFixableByRestart(int cores)
    {
        var dto = HealthyBaseline with { HardwareConcurrency = cores };

        var result = _service.AnalyzeClientMetrics(dto);

        Assert.Equal("Yellow", result.StatusColor);
        Assert.Contains("חלשה מבחינה חומרתית", result.SummaryTitle);
        Assert.False(result.IsFixableByRestart);
    }

    [Fact]
    public void WeakDeviceMemory_ReturnsYellow_NotFixableByRestart()
    {
        var dto = HealthyBaseline with { DeviceMemoryGb = 2 };

        var result = _service.AnalyzeClientMetrics(dto);

        Assert.Equal("Yellow", result.StatusColor);
        Assert.False(result.IsFixableByRestart);
    }

    [Fact]
    public void MissingOptionalMetrics_DoesNotThrow_AndReturnsGreen()
    {
        // דפדפנים כמו Safari לא תומכים ב-navigator.connection/deviceMemory,
        // אז השדות האופציונליים האלה יכולים להגיע כ-null בפועל
        var dto = HealthyBaseline with
        {
            EffectiveConnectionType = null,
            FrameJankMs = null,
            HardwareConcurrency = null,
            DeviceMemoryGb = null,
        };

        var result = _service.AnalyzeClientMetrics(dto);

        Assert.Equal("Green", result.StatusColor);
    }
}
