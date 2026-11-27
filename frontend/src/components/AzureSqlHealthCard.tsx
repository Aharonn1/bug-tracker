import React, { useMemo, useState } from 'react';
import { useSqlHealthMetrics } from '../hooks/useSqlHealthMetrics';
import { toMetricChartData } from '../utils/metricChartData';
import { colors } from '../styles/theme';
import { Card } from './ui/Card';
import { ResourceHealthBadge } from './ui/ResourceHealthBadge';
import { TrendAreaChart } from './charts/TrendAreaChart';
import { InfoButton } from './ui/InfoButton';
import { MetricInfoModal, type MetricExplain } from './ui/MetricInfoModal';

function sqlPercentExplain(specific: string, qa: { q: string; a: string }[]): MetricExplain {
  return {
    source: 'cloud',
    body: [
      specific,
      'טכנולוגיה: Azure.Monitor.Query SDK (MetricsQueryClient) - אותו מנגנון בדיוק כמו מדדי ה-App Service למעלה בעמוד ו-DTU בכרטיס "מגמת בריאות Azure לאורך חודשים" למטה, רק כאן כל 5 דקות על חלון 24 שעות.',
    ],
    qa,
  };
}

const DTU_24H_EXPLAIN = sqlPercentExplain(
  'אחוז מתוך משאב ה-DTU (Database Transaction Unit) שהוקצה למסד הנתונים - מדד מסכם שמשלב CPU/זיכרון/IO של ה-DB למספר אחד. סף התראה: 80%.',
  [
    { q: 'למה יש מספר אחוזים שונים (DTU, Workers, Sessions) ולא רק אחד?', a: 'כי כל אחד מודד צוואר בקבוק אחר - DTU הוא עומס חישובי מסכם, Workers הוא ריבוי שאילתות בו-זמנית, Sessions הוא מספר חיבורים פתוחים. אפשר שרק אחד מהם גבוה בזמן תקלה.' },
  ]
);
const WORKERS_EXPLAIN = sqlPercentExplain(
  'אחוז מתוך מספר ה-worker threads המקסימלי שמסד הנתונים יכול להריץ בו-זמנית, שכרגע בשימוש בפועל - גבוה כאן יכול להסביר שאילתות שמחכות לתור.',
  [
    { q: 'זה אותו דבר כמו DTU%?', a: 'לא - DTU הוא מדד עומס מסכם (CPU/זיכרון/IO יחד), בעוד Workers סופר ספציפית כמה שאילתות/בקשות רצות בו-זמנית. אפשר ש-DTU יהיה נמוך בזמן ש-Workers גבוה, אם יש הרבה שאילתות קלות אך מקבילות.' },
  ]
);
const SESSIONS_EXPLAIN = sqlPercentExplain(
  'אחוז מתוך מספר החיבורים (Sessions) המקסימלי המותר ל-DB, שפתוחים כרגע בפועל - כולל חיבורים "תקועים" שלא נסגרו כראוי, לא רק חיבורים פעילים ברגע זה.',
  [
    { q: 'חיבור פתוח אומר שהוא בהכרח עושה משהו?', a: 'לא - Session יכול להיות "idle" (פתוח אך לא פעיל). אם זה גבוה בלי ש-Workers/DTU גבוהים, זה יכול לרמז על חיבורים שלא משוחררים כראוי בקוד (connection leak) ולא על עומס אמיתי.' },
  ]
);

function sqlDiagnosticExplain(specific: string, qa: { q: string; a: string }[]): MetricExplain {
  return {
    source: 'cloud',
    body: [
      specific,
      'טכנולוגיה שונה מגרפי האחוזים למעלה: לא Azure Monitor Metrics אלא Log Analytics - שאילתת KQL (Kusto) על טבלת AzureDiagnostics, מבוססת על Diagnostic Setting ייעודי שמזרים אבחוני SQL ל-Workspace. שמור 30 יום בלבד (לעומת 93 יום למדדי האחוזים).',
      'האימות מול Azure כאן נעשה דרך Service Principal ייעודי (ClientSecretCredential) - מסלול נפרד משאר קריאות ה-Monitor בעמוד הזה.',
    ],
    qa,
  };
}

const DEADLOCKS_EXPLAIN = sqlDiagnosticExplain(
  'Deadlock: שני (או יותר) תהליכים ננעלים זה על זה בו-זמנית ואף אחד לא יכול להתקדם - SQL Server מזהה את זה ומבטל אוטומטית אחד הצדדים כדי לשחרר את השני.',
  [
    { q: 'אם יש Deadlock, המשתמש רואה שגיאה?', a: 'כן בדרך כלל - הצד שבוטל מקבל שגיאת SQL, שלרוב מגיעה אלינו כתקרית בטבלת האירועים. הספירה כאן היא האימות הבלתי-תלוי מ-Azure עצמו שזה באמת קרה.' },
  ]
);
const BLOCKS_EXPLAIN = sqlDiagnosticExplain(
  'Block: תהליך אחד מחזיק נעילה על שורה/טבלה ותהליך אחר ממתין לה - בניגוד ל-Deadlock זה לא תקוע לצמיתות, רק איטי, אבל ספירה גבוהה מצביעה על תחרות אמיתית על אותם נתונים.',
  [
    { q: 'Block תמיד נגמר מעצמו?', a: 'כמעט תמיד כן - ברגע שהתהליך החוסם משחרר את הנעילה. השאלה היא כמה זמן זה לוקח; Block ארוך מתבטא כתגובה איטית, לא בהכרח כשגיאה.' },
  ]
);
const ERRORS_EXPLAIN = sqlDiagnosticExplain(
  'ספירת שגיאות SQL כלליות שה-DB עצמו דיווח עליהן ברמת התשתית - נפרד לגמרי מתקריות שהקוד שלנו יוצר; זו שכבת האמת של Azure, לא דיווח של האפליקציה.',
  [
    { q: 'זה אותו מספר כמו תקריות SQL בטבלת האירועים שלנו?', a: 'לא בהכרח זהה - זו ספירה גולמית מ-Azure ברמת ה-DB. ייתכן פער קטן אם, למשל, שגיאה טופלה ב-retry בקוד לפני שהגיעה למשתמש, ולכן לא נוצרה ממנה תקרית.' },
  ]
);
const TIMEOUTS_EXPLAIN = sqlDiagnosticExplain(
  'שאילתה שלא הסתיימה בזמן שהוגדר לה (command timeout) ובוטלה - יכול להצביע על שאילתה כבדה מדי, או על עומס/נעילות (Blocks) שמעכבות אותה.',
  [
    { q: 'Timeout קשור ל-Block שמעל?', a: 'לעיתים כן - שאילתה שחוסמת מספיק זמן יכולה לגרום לשאילתה אחרת לעבור timeout. כדאי להסתכל על שניהם יחד, לא בנפרד.' },
  ]
);

// מדדי משאב Azure SQL בזמן אמת (DTU/Workers/Sessions), כדי לענות ישירות על
// "האם תקלת DB נגרמה מעומס אמיתי על המשאב, או משהו אחר" בלי לצאת ל-Azure
// Portal בכל פעם. הגנת Admin-בלבד נעשית ברמת העמוד שמארח את הקומפוננטה
export const AzureSqlHealthCard: React.FC = () => {
  const { metrics, loading, error, reload } = useSqlHealthMetrics(24);
  const [openMetric, setOpenMetric] = useState<
    'dtu' | 'workers' | 'sessions' | 'deadlocks' | 'blocks' | 'errors' | 'timeouts' | null
  >(null);

  const dtuData = useMemo(() => (metrics ? toMetricChartData(metrics.dtuPercent) : []), [metrics]);
  const workersData = useMemo(() => (metrics ? toMetricChartData(metrics.workersPercent) : []), [metrics]);
  const sessionsData = useMemo(() => (metrics ? toMetricChartData(metrics.sessionsPercent) : []), [metrics]);

  return (
    <Card
      title="בריאות משאב Azure SQL - 24 שעות אחרונות"
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
          שגיאה בטעינת מדדי Azure SQL: {error}
        </div>
      ) : !loading && !metrics ? (
        <div style={{ color: colors.textFaint, fontSize: '13px' }}>
          Azure Monitor למדדי SQL לא מוגדר כרגע עבור משתמש זה (חסרה הרשאת Monitoring Reader על משאב ה-SQL, או שהפרטים עדיין לא הוגדרו ב-App Settings).
        </div>
      ) : (
        <>
          <ResourceHealthBadge health={metrics?.resourceHealth ?? null} />
          {metrics?.diagnosticSummary && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '10px', marginBottom: '18px' }}>
              {([
                ['Deadlocks', metrics.diagnosticSummary.deadlocksCount, 'deadlocks'],
                ['Blocks', metrics.diagnosticSummary.blocksCount, 'blocks'],
                ['Errors', metrics.diagnosticSummary.errorsCount, 'errors'],
                ['Timeouts', metrics.diagnosticSummary.timeoutsCount, 'timeouts'],
              ] as const).map(([label, count, key]) => (
                <div
                  key={label}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    backgroundColor: count > 0 ? colors.dangerBg : colors.surfaceRaised,
                    border: `1px solid ${count > 0 ? colors.dangerBorder : colors.border}`,
                  }}
                >
                  <div style={{ fontSize: '18px', fontWeight: 700, color: count > 0 ? colors.dangerSoft : colors.textSecondary }}>
                    {count}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                    <span style={{ fontSize: '11px', color: colors.textFaint }}>{label}</span>
                    <InfoButton onClick={() => setOpenMetric(key)} />
                  </div>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: colors.textMuted }}>DTU percentage - סף התראה 80%</span>
                <InfoButton onClick={() => setOpenMetric('dtu')} />
              </div>
              <TrendAreaChart data={dtuData} color={colors.accentSoft} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: colors.textMuted }}>Workers percentage</span>
                <InfoButton onClick={() => setOpenMetric('workers')} />
              </div>
              <TrendAreaChart data={workersData} color={colors.violet} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: colors.textMuted }}>Sessions percentage</span>
                <InfoButton onClick={() => setOpenMetric('sessions')} />
              </div>
              <TrendAreaChart data={sessionsData} color={colors.warningSoft} />
            </div>
          </div>
        </>
      )}

      <div style={{ fontSize: '11px', color: colors.textFaint, marginTop: '14px', lineHeight: 1.6 }}>
        אם כל המדדים נמוכים לאורך זמן (רחוק מ-100%), תקלות "בסיס נתונים לא נגיש" כנראה לא נובעות מעומס על המשאב - כדאי לחפש את הסיבה בקוד או בבדיקות ידניות שבוצעו.
        <br />
        <strong>Deadlocks/Blocks/Errors/Timeouts</strong> הם אירועים נקודתיים (לא אחוזי ניצול) - כל ספירה מעל 0 שווה בדיקה ישירה, גם אם המדדים למעלה נראים תקינים לגמרי.
      </div>

      {openMetric === 'dtu' && (
        <MetricInfoModal title="DTU percentage" source={DTU_24H_EXPLAIN.source} body={DTU_24H_EXPLAIN.body} qa={DTU_24H_EXPLAIN.qa} onClose={() => setOpenMetric(null)} />
      )}
      {openMetric === 'workers' && (
        <MetricInfoModal title="Workers percentage" source={WORKERS_EXPLAIN.source} body={WORKERS_EXPLAIN.body} qa={WORKERS_EXPLAIN.qa} onClose={() => setOpenMetric(null)} />
      )}
      {openMetric === 'sessions' && (
        <MetricInfoModal title="Sessions percentage" source={SESSIONS_EXPLAIN.source} body={SESSIONS_EXPLAIN.body} qa={SESSIONS_EXPLAIN.qa} onClose={() => setOpenMetric(null)} />
      )}
      {openMetric === 'deadlocks' && (
        <MetricInfoModal title="Deadlocks" source={DEADLOCKS_EXPLAIN.source} body={DEADLOCKS_EXPLAIN.body} qa={DEADLOCKS_EXPLAIN.qa} onClose={() => setOpenMetric(null)} />
      )}
      {openMetric === 'blocks' && (
        <MetricInfoModal title="Blocks" source={BLOCKS_EXPLAIN.source} body={BLOCKS_EXPLAIN.body} qa={BLOCKS_EXPLAIN.qa} onClose={() => setOpenMetric(null)} />
      )}
      {openMetric === 'errors' && (
        <MetricInfoModal title="Errors" source={ERRORS_EXPLAIN.source} body={ERRORS_EXPLAIN.body} qa={ERRORS_EXPLAIN.qa} onClose={() => setOpenMetric(null)} />
      )}
      {openMetric === 'timeouts' && (
        <MetricInfoModal title="Timeouts" source={TIMEOUTS_EXPLAIN.source} body={TIMEOUTS_EXPLAIN.body} qa={TIMEOUTS_EXPLAIN.qa} onClose={() => setOpenMetric(null)} />
      )}
    </Card>
  );
};

export default AzureSqlHealthCard;
