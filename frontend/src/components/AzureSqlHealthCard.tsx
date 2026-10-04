import React, { useMemo } from 'react';
import { useSqlHealthMetrics } from '../hooks/useSqlHealthMetrics';
import { toMetricChartData } from '../utils/metricChartData';
import { colors } from '../styles/theme';
import { Card } from './ui/Card';
import { TrendAreaChart } from './charts/TrendAreaChart';

// מדדי משאב Azure SQL בזמן אמת (DTU/Workers/Sessions), כדי לענות ישירות על
// "האם תקלת DB נגרמה מעומס אמיתי על המשאב, או משהו אחר" בלי לצאת ל-Azure
// Portal בכל פעם. הגנת Admin-בלבד נעשית ברמת העמוד שמארח את הקומפוננטה
export const AzureSqlHealthCard: React.FC = () => {
  const { metrics, loading, error, reload } = useSqlHealthMetrics(24);

  const dtuData = useMemo(() => (metrics ? toMetricChartData(metrics.dtuPercent) : []), [metrics]);
  const workersData = useMemo(() => (metrics ? toMetricChartData(metrics.workersPercent) : []), [metrics]);
  const sessionsData = useMemo(() => (metrics ? toMetricChartData(metrics.sessionsPercent) : []), [metrics]);

  return (
    <Card
      title="בריאות משאב Azure SQL - 24 שעות אחרונות"
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
          שגיאה בטעינת מדדי Azure SQL: {error}
        </div>
      ) : !loading && !metrics ? (
        <div style={{ color: colors.textFaint, fontSize: '13px' }}>
          Azure Monitor למדדי SQL לא מוגדר כרגע עבור משתמש זה (חסרה הרשאת Monitoring Reader על משאב ה-SQL, או שהפרטים עדיין לא הוגדרו ב-App Settings).
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
          <div>
            <div style={{ fontSize: '12px', color: colors.textMuted, marginBottom: '8px' }}>DTU percentage</div>
            <TrendAreaChart data={dtuData} color={colors.accentSoft} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: colors.textMuted, marginBottom: '8px' }}>Workers percentage</div>
            <TrendAreaChart data={workersData} color={colors.violet} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: colors.textMuted, marginBottom: '8px' }}>Sessions percentage</div>
            <TrendAreaChart data={sessionsData} color={colors.warningSoft} />
          </div>
        </div>
      )}

      <div style={{ fontSize: '11px', color: colors.textFaint, marginTop: '14px', lineHeight: 1.6 }}>
        אם כל המדדים נמוכים לאורך זמן (רחוק מ-100%), תקלות "בסיס נתונים לא נגיש" כנראה לא נובעות מעומס על המשאב - כדאי לחפש את הסיבה בקוד או בבדיקות ידניות שבוצעו.
      </div>
    </Card>
  );
};

export default AzureSqlHealthCard;
