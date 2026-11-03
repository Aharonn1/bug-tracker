import React, { useMemo, useState } from 'react';
import { useAzureHealthMonthly } from '../hooks/useAzureHealthMonthly';
import { toMetricChartData } from '../utils/metricChartData';
import { colors } from '../styles/theme';
import { Card } from './ui/Card';
import { TrendAreaChart } from './charts/TrendAreaChart';

const MONTH_NAMES = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
];

function startOfCurrentMonth(): { year: number; month: number } {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

// עמוד "התמונה הגדולה" - מגמת בריאות Azure לאורך חודשים, לא רק 24 שעות
// אחרונות. משלב שני מקורות שונים במכוון (ראו הסברים בבקאנד): ספירת
// התרעות מדויקת (AzureAlertOccurrences, בלי מגבלת שמירה) ומדדי ביצועים
// גולמיים (כפופים למגבלות השמירה של Azure - 93/30 יום)
export const AzureHealthMonthlyCard: React.FC = () => {
  const [{ year, month }, setPeriod] = useState(startOfCurrentMonth());
  const { data, loading, error, reload } = useAzureHealthMonthly(year, month);

  const { year: curYear, month: curMonth } = startOfCurrentMonth();
  const isCurrentMonth = year === curYear && month === curMonth;

  const goPrev = () => {
    setPeriod((p) => (p.month === 1 ? { year: p.year - 1, month: 12 } : { year: p.year, month: p.month - 1 }));
  };
  const goNext = () => {
    if (isCurrentMonth) return;
    setPeriod((p) => (p.month === 12 ? { year: p.year + 1, month: 1 } : { year: p.year, month: p.month + 1 }));
  };

  const dailyOccurrencesData = useMemo(
    () => (data ? data.occurrences.dailyBreakdown.map((d) => ({ label: String(d.day), value: d.count })) : []),
    [data]
  );

  const cpuPercentData = useMemo(
    () => (data?.appServiceMetrics?.cpuPercent ? toMetricChartData(data.appServiceMetrics.cpuPercent) : []),
    [data]
  );
  const memoryPercentData = useMemo(
    () => (data?.appServiceMetrics?.memoryPercent ? toMetricChartData(data.appServiceMetrics.memoryPercent) : []),
    [data]
  );
  const responseTimeData = useMemo(
    () => (data?.appServiceMetrics ? toMetricChartData(data.appServiceMetrics.averageResponseTimeSeconds) : []),
    [data]
  );
  const dtuData = useMemo(
    () => (data?.sqlMetrics ? toMetricChartData(data.sqlMetrics.dtuPercent) : []),
    [data]
  );

  const earliestTracked = data?.occurrences.earliestTrackedOccurrence
    ? new Date(data.occurrences.earliestTrackedOccurrence)
    : null;
  const viewedMonthStart = new Date(Date.UTC(year, month - 1, 1));
  const beforeTrackingStarted = earliestTracked !== null && viewedMonthStart < earliestTracked;

  return (
    <Card
      title="מגמת בריאות Azure לאורך חודשים"
      action={
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button onClick={goPrev} disabled={loading} style={navButtonStyle(loading)}>
            חודש קודם
          </button>
          <span style={{ fontSize: '13px', fontWeight: 700, color: colors.textPrimary, minWidth: '90px', textAlign: 'center' }}>
            {MONTH_NAMES[month - 1]} {year}
          </span>
          <button onClick={goNext} disabled={loading || isCurrentMonth} style={navButtonStyle(loading || isCurrentMonth)}>
            חודש הבא
          </button>
          <button onClick={reload} disabled={loading} style={{ ...navButtonStyle(loading), marginInlineStart: '6px' }}>
            {loading ? 'טוען...' : 'רענן'}
          </button>
        </div>
      }
    >
      {error ? (
        <div style={{ color: colors.dangerSoft, fontSize: '13px' }}>שגיאה בטעינת מגמה חודשית: {error}</div>
      ) : !loading && !data ? (
        <div style={{ color: colors.textFaint, fontSize: '13px' }}>אין הרשאה לנתוני בריאות Azure, או שהם לא מוגדרים.</div>
      ) : !data ? null : (
        <>
          {beforeTrackingStarted && (
            <div
              style={{
                padding: '10px 14px',
                backgroundColor: colors.warningBg,
                border: `1px solid ${colors.warning}`,
                borderRadius: '8px',
                color: colors.warningSoft,
                fontSize: '12px',
                marginBottom: '16px',
                lineHeight: 1.6,
              }}
            >
              מעקב מדויק של התרעות Azure זמין החל מ-{earliestTracked!.toLocaleDateString('he-IL')} - לפני התאריך הזה, 0 לא בהכרח אומר שלא היו תקלות, רק שהמעקב הזה עוד לא היה קיים.
            </div>
          )}

          <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: '20px' }}>
            <div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: colors.textPrimary }}>{data.occurrences.totalOccurrences}</div>
              <div style={{ fontSize: '12px', color: colors.textMuted }}>סה"כ התרעות Azure בחודש זה</div>
            </div>

            {data.occurrences.byAlertType.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {data.occurrences.byAlertType.map((a) => (
                  <div key={a.alertType} style={{ fontSize: '12px', color: colors.textSecondary, display: 'flex', gap: '8px' }}>
                    <span style={{ fontWeight: 700, color: colors.textPrimary, minWidth: '20px' }}>{a.count}</span>
                    <span>{a.alertType}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ marginBottom: '8px' }}>
            <div style={{ fontSize: '12px', color: colors.textMuted, marginBottom: '8px' }}>התרעות לפי יום בחודש</div>
            <TrendAreaChart data={dailyOccurrencesData} color={colors.dangerSoft} />
          </div>

          <div style={{ fontSize: '12px', color: colors.textMuted, margin: '20px 0 8px', fontWeight: 700 }}>
            מדדי ביצועים גולמיים (ממוצע יומי)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
            <div>
              <div style={{ fontSize: '12px', color: colors.textMuted, marginBottom: '8px' }}>CPU % (App Service Plan)</div>
              {data.appServiceMetrics ? (
                <TrendAreaChart data={cpuPercentData} color={colors.accentSoft} />
              ) : (
                <NoDataForRangeNote />
              )}
            </div>
            <div>
              <div style={{ fontSize: '12px', color: colors.textMuted, marginBottom: '8px' }}>Memory % (App Service Plan)</div>
              {data.appServiceMetrics ? (
                <TrendAreaChart data={memoryPercentData} color={colors.violet} />
              ) : (
                <NoDataForRangeNote />
              )}
            </div>
            <div>
              <div style={{ fontSize: '12px', color: colors.textMuted, marginBottom: '8px' }}>זמן תגובה ממוצע (שניות)</div>
              {data.appServiceMetrics ? (
                <TrendAreaChart data={responseTimeData} color={colors.warningSoft} />
              ) : (
                <NoDataForRangeNote />
              )}
            </div>
            <div>
              <div style={{ fontSize: '12px', color: colors.textMuted, marginBottom: '8px' }}>SQL DTU percentage</div>
              {data.sqlMetrics ? (
                <TrendAreaChart data={dtuData} color="#f472b6" />
              ) : (
                <NoDataForRangeNote />
              )}
            </div>
          </div>
        </>
      )}

      <div style={{ fontSize: '11px', color: colors.textFaint, marginTop: '14px', lineHeight: 1.6 }}>
        ספירת ההתרעות לעולם לא נמחקת ולא כפופה למגבלת שמירה. מדדי הביצועים הגולמיים כן - Azure Monitor שומר מדדים 93 יום, ו-Log Analytics (אבחוני SQL) 30 יום בלבד, זו מגבלה של Azure עצמו, לא תקלה אצלנו.
      </div>
    </Card>
  );
};

const NoDataForRangeNote: React.FC = () => (
  <div style={{ fontSize: '12px', color: colors.textFaint, padding: '20px 0' }}>
    אין נתונים לחודש זה - כנראה מחוץ לטווח השמירה של Azure.
  </div>
);

const navButtonStyle = (disabled: boolean): React.CSSProperties => ({
  backgroundColor: 'transparent',
  border: `1px solid ${colors.border}`,
  color: disabled ? colors.textFaint : colors.textMuted,
  borderRadius: '6px',
  padding: '4px 10px',
  fontSize: '12px',
  cursor: disabled ? 'default' : 'pointer',
  opacity: disabled ? 0.5 : 1,
});

export default AzureHealthMonthlyCard;
