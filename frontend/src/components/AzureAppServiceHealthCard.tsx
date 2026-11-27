import React, { useMemo, useState } from 'react';
import { useAppServiceHealthMetrics } from '../hooks/useAppServiceHealthMetrics';
import { toMetricChartData } from '../utils/metricChartData';
import { colors } from '../styles/theme';
import { Card } from './ui/Card';
import { ResourceHealthBadge } from './ui/ResourceHealthBadge';
import { TrendAreaChart } from './charts/TrendAreaChart';
import { InfoButton } from './ui/InfoButton';
import { MetricInfoModal, type MetricExplain } from './ui/MetricInfoModal';

function appServiceMetricExplain(specific: string, qa: { q: string; a: string }[]): MetricExplain {
  return {
    source: 'cloud',
    body: [
      specific,
      'טכנולוגיה: Azure.Monitor.Query SDK (MetricsQueryClient) - קריאה ישירה ל-Azure Monitor, דגימה כל 5 דקות על חלון 24 השעות האחרונות. אותו מנגנון בדיוק כמו בכרטיס "מגמת בריאות Azure לאורך חודשים" למטה בעמוד, רק בגרנולריות עדינה הרבה יותר (5 דקות לעומת ממוצע יומי).',
    ],
    qa,
  };
}

const CPU_PERCENT_EXPLAIN = appServiceMetricExplain(
  'אחוז ניצול ה-CPU של כל ה-App Service Plan (לא רק התהליך שלנו - כל מה שמשותף על אותו Plan). סף ההתראה (80%) מוגדר מראש ב-Azure Monitor.',
  [
    { q: 'זה אחוז מה-CPU של השרת שלנו בלבד?', a: 'לא - זה אחוז מתוך כל ה-App Service Plan. אם יש עוד שירות שרץ על אותו Plan, הוא משפיע גם הוא על המספר הזה.' },
  ]
);
const MEMORY_PERCENT_EXPLAIN = appServiceMetricExplain(
  'אחוז ניצול הזיכרון של כל ה-App Service Plan, מאותו עיקרון כמו CPU % - סף ההתראה (85%) הוא ברמת ה-Plan כולו, לא רק התהליך שלנו.',
  [
    { q: 'אם זה גבוה, זה אומר שיש memory leak בקוד שלנו?', a: 'לא בהכרח - זה כולל את כל מה שרץ על אותו Plan. כדי לבודד את התהליך שלנו בלבד, יש להסתכל על Memory Working Set הספציפי.' },
  ]
);
const CPU_TIME_EXPLAIN = appServiceMetricExplain(
  'זמן CPU מצטבר (בשניות) שהתהליך שלנו צרך בחלון הזמן - מדד גולמי יותר מ-CPU%, בלי נרמול לפי Plan.',
  [
    { q: 'למה צריך גם את זה וגם CPU %?', a: 'CPU% הוא יחסי לכל ה-Plan; CPU Time הוא מדד מוחלט רק של התהליך שלנו - שימושי להשוואה בין תקופות בלי תלות במה שעוד רץ על אותו Plan.' },
  ]
);
const MEMORY_WORKING_SET_EXPLAIN = appServiceMetricExplain(
  'כמות הזיכרון הפיזי (RAM) שהתהליך של השרת שלנו מחזיק בפועל ברגע הדגימה (Working Set) - בניגוד ל-Memory %, זה ספציפי לתהליך שלנו בלבד.',
  [
    { q: 'זה כולל גם זיכרון וירטואלי?', a: 'לא - Working Set הוא הזיכרון הפיזי שבאמת נמצא ב-RAM כרגע, לא כל מה שהתהליך "תפס" לוגית.' },
  ]
);
const REQUESTS_EXPLAIN = appServiceMetricExplain(
  'מספר בקשות ה-HTTP שהגיעו ל-App Service בחלון הזמן - נספר על ידי Azure עצמו ברמת התשתית, לא על ידי קוד שלנו.',
  [
    { q: 'זה כולל גם בקשות שנכשלו?', a: 'כן - זו ספירה גולמית של כל בקשה שהגיעה, בלי קשר להצלחה או כישלון. בקשות שנכשלו עם 5xx נספרות גם במדד הנפרד "שגיאות 5xx".' },
  ]
);
const HTTP_5XX_EXPLAIN = appServiceMetricExplain(
  'מספר התגובות עם קוד שגיאת שרת (5xx) שחזרו בפועל ללקוחות - נמדד על ידי Azure ברמת ה-HTTP, בלי תלות בזה שהקוד שלנו בכלל דיווח על תקרית.',
  [
    { q: 'זה אותו דבר כמו תקריות בטבלת האירועים שלנו?', a: 'לא בהכרח - זו ספירה גולמית של תשובות 5xx ברמת הרשת. ייתכן 5xx שלא נוצרה ממנו תקרית (למשל timeout ברמת התשתית), ולהפך - תקרית שלא נגרמה מ-5xx (למשל שגיאת לקוח).' },
  ]
);
const RESPONSE_TIME_24H_EXPLAIN = appServiceMetricExplain(
  'זמן התגובה הממוצע שה-App Service עצמו מדד לכל בקשה (סף התראה: 3 שניות) - נמדד בצד השרת, לפני שהתגובה יוצאת לרשת בחזרה ללקוח.',
  [
    { q: 'זה כולל את זמן הרשת עד הדפדפן של המשתמש?', a: 'לא - זה רק הזמן שלקח לשרת עצמו לעבד ולהשיב. זמן רשת/דפדפן בפועל אצל המשתמש הקצה יכול להיות גבוה יותר.' },
  ]
);
const HTTP_QUEUE_LENGTH_EXPLAIN: MetricExplain = {
  source: 'cloud',
  body: [
    'מספר הבקשות שממתינות בתור כרגע כי כל ה-worker threads של השרת תפוסים - לא אחוז ולא זמן, אלא ספירת בקשות ממתינות ברגע הדגימה.',
    'זו לרוב ההוכחה הכי ישירה ל"השרת לא מדביק עומס": תור מעל 0 אומר שיש בקשות אמיתיות שמחכות, לא רק ש-CPU/Memory גבוהים.',
    'טכנולוגיה: אותו Azure.Monitor.Query SDK (MetricsQueryClient) כמו שאר המדדים בכרטיס הזה - רק שם המדד השונה הוא HttpQueueLength.',
  ],
  qa: [
    { q: 'אם זה 0 כל הזמן, זה אומר שאין בעיית עומס בכלל?', a: 'כן - אם אין אף בקשה שממתינה ל-worker פנוי, אין בעיית "תפוסה" ברמת ה-App Service. תגובה איטית במקרה כזה כנראה מגיעה ממקום אחר (כמו ה-DB).' },
    { q: 'איך זה שונה מ-Response Time?', a: 'Response Time מודד כמה זמן לקח לענות לבקשה שכן טופלה. HttpQueueLength מודד כמה בקשות בכלל עדיין מחכות לתור - שני דברים נפרדים שיכולים לקרות גם בלי קשר זה לזה.' },
  ],
};

// מדדי משאב ה-App Service (הבקאנד עצמו) - CPU, זיכרון, בקשות, שגיאות 5xx
// וזמן תגובה. זה המשאב שעומד מול המשתמשים ישירות, ולכן המקום הראשון
// לבדוק בו אם האתר "מתחיל להתכופף" תחת עומס
export const AzureAppServiceHealthCard: React.FC = () => {
  const { metrics, loading, error, reload } = useAppServiceHealthMetrics(24);
  const [openMetric, setOpenMetric] = useState<
    'cpuPercent' | 'memoryPercent' | 'cpuTime' | 'memoryWorkingSet' | 'requests' | 'http5xx' | 'responseTime' | 'queueLength' | null
  >(null);

  const cpuData = useMemo(() => (metrics ? toMetricChartData(metrics.cpuTimeSeconds) : []), [metrics]);
  const memoryData = useMemo(() => (metrics ? toMetricChartData(metrics.memoryWorkingSetBytes) : []), [metrics]);
  const requestsData = useMemo(() => (metrics ? toMetricChartData(metrics.requests) : []), [metrics]);
  const http5xxData = useMemo(() => (metrics ? toMetricChartData(metrics.http5xx) : []), [metrics]);
  const responseTimeData = useMemo(() => (metrics ? toMetricChartData(metrics.averageResponseTimeSeconds) : []), [metrics]);
  const queueLengthData = useMemo(() => (metrics ? toMetricChartData(metrics.httpQueueLength) : []), [metrics]);
  const cpuPercentData = useMemo(() => (metrics?.cpuPercent ? toMetricChartData(metrics.cpuPercent) : []), [metrics]);
  const memoryPercentData = useMemo(() => (metrics?.memoryPercent ? toMetricChartData(metrics.memoryPercent) : []), [metrics]);

  return (
    <Card
      title="בריאות App Service (הבקאנד) - 24 שעות אחרונות"
      action={
        <button
          onClick={() => reload()}
          disabled={loading}
          style={{
            backgroundColor: 'transparent',
            border: `1px solid ${colors.border}`,
            color: colors.textMuted,
            borderRadius: '6px',
            padding: '4px 10px',
            fontSize: '12px',
            cursor: loading ? 'default' : 'pointer',
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? 'טוען...' : 'רענן'}
        </button>
      }
    >
      {error ? (
        <div style={{ color: colors.dangerSoft, fontSize: '13px' }}>
          שגיאה בטעינת מדדי App Service: {error}
        </div>
      ) : !loading && !metrics ? (
        <div style={{ color: colors.textFaint, fontSize: '13px' }}>
          Azure Monitor למדדי App Service לא מוגדר כרגע (חסרה הרשאת Monitoring Reader, או שהפרטים עדיין לא הוגדרו ב-App Settings).
        </div>
      ) : (
        <>
          <ResourceHealthBadge health={metrics?.resourceHealth ?? null} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', color: colors.textMuted }}>CPU % (App Service Plan) - סף התראה 80%</span>
              <InfoButton onClick={() => setOpenMetric('cpuPercent')} />
            </div>
            <TrendAreaChart data={cpuPercentData} color={colors.accentSoft} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', color: colors.textMuted }}>Memory % (App Service Plan) - סף התראה 85%</span>
              <InfoButton onClick={() => setOpenMetric('memoryPercent')} />
            </div>
            <TrendAreaChart data={memoryPercentData} color={colors.violet} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', color: colors.textMuted }}>CPU Time (שניות)</span>
              <InfoButton onClick={() => setOpenMetric('cpuTime')} />
            </div>
            <TrendAreaChart data={cpuData} color={colors.accentSoft} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', color: colors.textMuted }}>Memory Working Set</span>
              <InfoButton onClick={() => setOpenMetric('memoryWorkingSet')} />
            </div>
            <TrendAreaChart data={memoryData} color={colors.violet} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', color: colors.textMuted }}>בקשות (Requests)</span>
              <InfoButton onClick={() => setOpenMetric('requests')} />
            </div>
            <TrendAreaChart data={requestsData} color={colors.successSoft} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', color: colors.textMuted }}>שגיאות 5xx</span>
              <InfoButton onClick={() => setOpenMetric('http5xx')} />
            </div>
            <TrendAreaChart data={http5xxData} color={colors.dangerSoft} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', color: colors.textMuted }}>זמן תגובה ממוצע (שניות) - סף התראה 3 שניות</span>
              <InfoButton onClick={() => setOpenMetric('responseTime')} />
            </div>
            <TrendAreaChart data={responseTimeData} color={colors.warningSoft} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', color: colors.textMuted }}>אורך תור HTTP (HttpQueueLength)</span>
              <InfoButton onClick={() => setOpenMetric('queueLength')} />
            </div>
            <TrendAreaChart data={queueLengthData} color="#f472b6" />
          </div>
          </div>
        </>
      )}

      <div style={{ fontSize: '11px', color: colors.textFaint, marginTop: '14px', lineHeight: 1.6 }}>
        עלייה חדה ב-CPU/זיכרון יחד עם זמן תגובה גדל היא הסימן הקלאסי ל"האתר לא מחזיק עומס" - שונה לגמרי מתקלת DB, ודורש פתרון אחר (scale up/out של ה-App Service, לא של ה-SQL).
        <br />
        <strong>אורך תור HTTP מעל 0</strong> הוא ההוכחה הישירה ביותר: זה אומר שיש בקשות שממתינות כי אין worker thread פנוי לטפל בהן - בדיוק מה שבדיקת העומס מול /health (בלי DB בכלל) חשפה.
      </div>

      {openMetric === 'cpuPercent' && (
        <MetricInfoModal title="CPU % (App Service Plan)" source={CPU_PERCENT_EXPLAIN.source} body={CPU_PERCENT_EXPLAIN.body} qa={CPU_PERCENT_EXPLAIN.qa} onClose={() => setOpenMetric(null)} />
      )}
      {openMetric === 'memoryPercent' && (
        <MetricInfoModal title="Memory % (App Service Plan)" source={MEMORY_PERCENT_EXPLAIN.source} body={MEMORY_PERCENT_EXPLAIN.body} qa={MEMORY_PERCENT_EXPLAIN.qa} onClose={() => setOpenMetric(null)} />
      )}
      {openMetric === 'cpuTime' && (
        <MetricInfoModal title="CPU Time (שניות)" source={CPU_TIME_EXPLAIN.source} body={CPU_TIME_EXPLAIN.body} qa={CPU_TIME_EXPLAIN.qa} onClose={() => setOpenMetric(null)} />
      )}
      {openMetric === 'memoryWorkingSet' && (
        <MetricInfoModal title="Memory Working Set" source={MEMORY_WORKING_SET_EXPLAIN.source} body={MEMORY_WORKING_SET_EXPLAIN.body} qa={MEMORY_WORKING_SET_EXPLAIN.qa} onClose={() => setOpenMetric(null)} />
      )}
      {openMetric === 'requests' && (
        <MetricInfoModal title="בקשות (Requests)" source={REQUESTS_EXPLAIN.source} body={REQUESTS_EXPLAIN.body} qa={REQUESTS_EXPLAIN.qa} onClose={() => setOpenMetric(null)} />
      )}
      {openMetric === 'http5xx' && (
        <MetricInfoModal title="שגיאות 5xx" source={HTTP_5XX_EXPLAIN.source} body={HTTP_5XX_EXPLAIN.body} qa={HTTP_5XX_EXPLAIN.qa} onClose={() => setOpenMetric(null)} />
      )}
      {openMetric === 'responseTime' && (
        <MetricInfoModal title="זמן תגובה ממוצע (שניות)" source={RESPONSE_TIME_24H_EXPLAIN.source} body={RESPONSE_TIME_24H_EXPLAIN.body} qa={RESPONSE_TIME_24H_EXPLAIN.qa} onClose={() => setOpenMetric(null)} />
      )}
      {openMetric === 'queueLength' && (
        <MetricInfoModal title="אורך תור HTTP (HttpQueueLength)" source={HTTP_QUEUE_LENGTH_EXPLAIN.source} body={HTTP_QUEUE_LENGTH_EXPLAIN.body} qa={HTTP_QUEUE_LENGTH_EXPLAIN.qa} onClose={() => setOpenMetric(null)} />
      )}
    </Card>
  );
};

export default AzureAppServiceHealthCard;
