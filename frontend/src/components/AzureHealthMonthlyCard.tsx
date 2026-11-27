import React, { useMemo, useState } from 'react';
import { useAzureHealthMonthly } from '../hooks/useAzureHealthMonthly';
import { toMetricChartData } from '../utils/metricChartData';
import { colors } from '../styles/theme';
import { Card } from './ui/Card';
import { TrendAreaChart } from './charts/TrendAreaChart';
import { InfoButton } from './ui/InfoButton';
import { MetricInfoModal, type MetricExplain } from './ui/MetricInfoModal';

const DAILY_ALERTS_EXPLAIN: MetricExplain = {
  source: 'cloud',
  body: [
    'סופר כל פעם שחוק-התרעה של Azure Monitor באמת ירה (DTU גבוה, CPU גבוה וכו\') - לא מדידה רציפה, אירוע נקודתי. נשמר אצלנו ב-DB (טבלה ייעודית) ברגע שהוא קורה, בלי מגבלת שמירה - בניגוד למדדים הגולמיים למטה.',
  ],
  qa: [
    { q: 'זה אותו דבר כמו המדדים הגולמיים למטה?', a: 'לא - זו ספירת אירועי-התרעה בפועל (מתי Azure באמת החליט שמשהו חריג), לא המדידה הרציפה עצמה.' },
    { q: 'למה זה לא נעלם אחרי זמן, בניגוד למדדים?', a: 'כי ברגע שהתרעה יורה, אנחנו שומרים אותה אצלנו ב-DB - לא שואלים את Azure מחדש כל פעם. Azure עצמו כן מוחק היסטוריה ישנה, אבל אנחנו כבר תיעדנו אותה.' },
    { q: 'מה היתרון בלראות את זה לפי חודש, לא רק 24 שעות אחרונות?', a: 'מאפשר לזהות דפוס (למשל "כל סוף חודש יש עומס") שלא נראה בחלון זמן קצר.' },
  ],
};

function rawMetricExplain(metricName: string, retentionSource: 'Azure Monitor (93 יום)' | 'Log Analytics (30 יום)'): MetricExplain {
  return {
    source: 'cloud',
    body: [
      `ממוצע יומי של ${metricName}, נשלף ישירות מ-Azure עצמו - לא נמדד או מחושב אצלנו.`,
      `שמור ב-${retentionSource} בלבד - חודשים ישנים יותר מציגים "אין נתונים לחודש זה", וזו מגבלת שמירה של Azure עצמו, לא תקלה באתר.`,
    ],
    qa: [
      { q: 'איך זה שונה מספירת ההתרעות למעלה?', a: 'ההתרעות הן אירועים נקודתיים שנשמרים אצלנו לתמיד. זה כאן מדידה רציפה שנשלפת מ-Azure בכל פעם מחדש - ולכן כפופה למגבלת השמירה שלו.' },
      { q: 'אם בוחרים חודש ישן ורואים "אין נתונים" - זה אומר שהמערכת הייתה כבויה?', a: 'לא בהכרח - זה בדרך כלל אומר רק שהמדידה הגולמית כבר נמחקה אצל Azure (עבר זמן השמירה), לא שהיה אירוע כלשהו.' },
      { q: 'אפשר להאריך את זמן השמירה הזה?', a: 'זו הגדרה ברמת Azure Monitor/Log Analytics עצמם, לא קוד שלנו - אפשרי בעקרון, אבל כרוך בעלות נוספת.' },
    ],
  };
}

const CPU_EXPLAIN = rawMetricExplain('ניצול מעבד (CPU) בשרת', 'Azure Monitor (93 יום)');
const MEMORY_EXPLAIN = rawMetricExplain('ניצול זיכרון (Memory) בשרת', 'Azure Monitor (93 יום)');
const RESPONSE_TIME_EXPLAIN = rawMetricExplain('זמן תגובת השרת', 'Azure Monitor (93 יום)');
const DTU_EXPLAIN = rawMetricExplain('עומס מסד הנתונים (DTU)', 'Log Analytics (30 יום)');

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
  const [openMetric, setOpenMetric] = useState<'alerts' | 'cpu' | 'memory' | 'response' | 'dtu' | null>(null);
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
          <button onClick={() => reload()} disabled={loading} style={{ ...navButtonStyle(loading), marginInlineStart: '6px' }}>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', color: colors.textMuted }}>התרעות לפי יום בחודש</span>
              <InfoButton onClick={() => setOpenMetric('alerts')} />
            </div>
            <TrendAreaChart data={dailyOccurrencesData} color={colors.dangerSoft} />
          </div>

          <div style={{ fontSize: '12px', color: colors.textMuted, margin: '20px 0 8px', fontWeight: 700 }}>
            מדדי ביצועים גולמיים (ממוצע יומי)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: colors.textMuted }}>CPU % (App Service Plan)</span>
                <InfoButton onClick={() => setOpenMetric('cpu')} />
              </div>
              {data.appServiceMetrics ? (
                <TrendAreaChart data={cpuPercentData} color={colors.accentSoft} />
              ) : (
                <NoDataForRangeNote />
              )}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: colors.textMuted }}>Memory % (App Service Plan)</span>
                <InfoButton onClick={() => setOpenMetric('memory')} />
              </div>
              {data.appServiceMetrics ? (
                <TrendAreaChart data={memoryPercentData} color={colors.violet} />
              ) : (
                <NoDataForRangeNote />
              )}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: colors.textMuted }}>זמן תגובה ממוצע (שניות)</span>
                <InfoButton onClick={() => setOpenMetric('response')} />
              </div>
              {data.appServiceMetrics ? (
                <TrendAreaChart data={responseTimeData} color={colors.warningSoft} />
              ) : (
                <NoDataForRangeNote />
              )}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: colors.textMuted }}>SQL DTU percentage</span>
                <InfoButton onClick={() => setOpenMetric('dtu')} />
              </div>
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

      {openMetric === 'alerts' && (
        <MetricInfoModal title="התרעות לפי יום בחודש" source={DAILY_ALERTS_EXPLAIN.source} body={DAILY_ALERTS_EXPLAIN.body} qa={DAILY_ALERTS_EXPLAIN.qa} onClose={() => setOpenMetric(null)} />
      )}
      {openMetric === 'cpu' && (
        <MetricInfoModal title="CPU % (App Service Plan)" source={CPU_EXPLAIN.source} body={CPU_EXPLAIN.body} qa={CPU_EXPLAIN.qa} onClose={() => setOpenMetric(null)} />
      )}
      {openMetric === 'memory' && (
        <MetricInfoModal title="Memory % (App Service Plan)" source={MEMORY_EXPLAIN.source} body={MEMORY_EXPLAIN.body} qa={MEMORY_EXPLAIN.qa} onClose={() => setOpenMetric(null)} />
      )}
      {openMetric === 'response' && (
        <MetricInfoModal title="זמן תגובה ממוצע (שניות)" source={RESPONSE_TIME_EXPLAIN.source} body={RESPONSE_TIME_EXPLAIN.body} qa={RESPONSE_TIME_EXPLAIN.qa} onClose={() => setOpenMetric(null)} />
      )}
      {openMetric === 'dtu' && (
        <MetricInfoModal title="SQL DTU percentage" source={DTU_EXPLAIN.source} body={DTU_EXPLAIN.body} qa={DTU_EXPLAIN.qa} onClose={() => setOpenMetric(null)} />
      )}
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
