import React, { useMemo } from 'react';
import { useAppServiceHealthMetrics } from '../hooks/useAppServiceHealthMetrics';
import { toMetricChartData } from '../utils/metricChartData';
import { colors } from '../styles/theme';
import { Card } from './ui/Card';
import { TrendAreaChart } from './charts/TrendAreaChart';

// מדדי משאב ה-App Service (הבקאנד עצמו) - CPU, זיכרון, בקשות, שגיאות 5xx
// וזמן תגובה. זה המשאב שעומד מול המשתמשים ישירות, ולכן המקום הראשון
// לבדוק בו אם האתר "מתחיל להתכופף" תחת עומס
export const AzureAppServiceHealthCard: React.FC = () => {
  const { metrics, loading, error, reload } = useAppServiceHealthMetrics(24);

  const cpuData = useMemo(() => (metrics ? toMetricChartData(metrics.cpuTimeSeconds) : []), [metrics]);
  const memoryData = useMemo(() => (metrics ? toMetricChartData(metrics.memoryWorkingSetBytes) : []), [metrics]);
  const requestsData = useMemo(() => (metrics ? toMetricChartData(metrics.requests) : []), [metrics]);
  const http5xxData = useMemo(() => (metrics ? toMetricChartData(metrics.http5xx) : []), [metrics]);
  const responseTimeData = useMemo(() => (metrics ? toMetricChartData(metrics.averageResponseTimeSeconds) : []), [metrics]);
  const queueLengthData = useMemo(() => (metrics ? toMetricChartData(metrics.httpQueueLength) : []), [metrics]);

  return (
    <Card
      title="בריאות App Service (הבקאנד) - 24 שעות אחרונות"
      action={
        <button
          onClick={reload}
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
          <div>
            <div style={{ fontSize: '12px', color: colors.textMuted, marginBottom: '8px' }}>CPU Time (שניות)</div>
            <TrendAreaChart data={cpuData} color={colors.accentSoft} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: colors.textMuted, marginBottom: '8px' }}>Memory Working Set</div>
            <TrendAreaChart data={memoryData} color={colors.violet} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: colors.textMuted, marginBottom: '8px' }}>בקשות (Requests)</div>
            <TrendAreaChart data={requestsData} color={colors.successSoft} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: colors.textMuted, marginBottom: '8px' }}>שגיאות 5xx</div>
            <TrendAreaChart data={http5xxData} color={colors.dangerSoft} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: colors.textMuted, marginBottom: '8px' }}>זמן תגובה ממוצע (שניות)</div>
            <TrendAreaChart data={responseTimeData} color={colors.warningSoft} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: colors.textMuted, marginBottom: '8px' }}>אורך תור HTTP (HttpQueueLength)</div>
            <TrendAreaChart data={queueLengthData} color="#f472b6" />
          </div>
        </div>
      )}

      <div style={{ fontSize: '11px', color: colors.textFaint, marginTop: '14px', lineHeight: 1.6 }}>
        עלייה חדה ב-CPU/זיכרון יחד עם זמן תגובה גדל היא הסימן הקלאסי ל"האתר לא מחזיק עומס" - שונה לגמרי מתקלת DB, ודורש פתרון אחר (scale up/out של ה-App Service, לא של ה-SQL).
        <br />
        <strong>אורך תור HTTP מעל 0</strong> הוא ההוכחה הישירה ביותר: זה אומר שיש בקשות שממתינות כי אין worker thread פנוי לטפל בהן - בדיוק מה שבדיקת העומס מול /health (בלי DB בכלל) חשפה.
      </div>
    </Card>
  );
};

export default AzureAppServiceHealthCard;
