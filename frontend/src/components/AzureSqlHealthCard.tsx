import React, { useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { UserRole } from '../types/auth.types';
import { useSqlHealthMetrics } from '../hooks/useSqlHealthMetrics';
import type { MetricPointDto } from '../types/telemetry.types';
import { colors } from '../styles/theme';
import { Card } from './ui/Card';
import { TrendAreaChart } from './charts/TrendAreaChart';

// כולל תאריך ולא רק שעה - הטווח הוא 24 שעות, כך שהנקודה הראשונה והאחרונה
// הן כמעט תמיד בימים שונים. בלי התאריך שתי הנקודות נראות כמעט זהות (רק
// שעה:דקה), כאילו כל הטווח הוא כמה דקות בודדות
function toChartData(points: MetricPointDto[]) {
  return points.map((p) => ({
    label: new Date(p.timestamp).toLocaleString('he-IL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
    value: p.value ?? 0,
  }));
}

// גלוי רק ל-Admin - מדדי משאב Azure SQL בזמן אמת (DTU/Workers/Sessions),
// כדי לענות ישירות על "האם תקלת DB נגרמה מעומס אמיתי על המשאב, או משהו אחר"
// בלי לצאת ל-Azure Portal בכל פעם
export const AzureSqlHealthCard: React.FC = () => {
  const { user } = useAuth();
  const { metrics, loading, error, reload } = useSqlHealthMetrics(24);

  const dtuData = useMemo(() => (metrics ? toChartData(metrics.dtuPercent) : []), [metrics]);
  const workersData = useMemo(() => (metrics ? toChartData(metrics.workersPercent) : []), [metrics]);
  const sessionsData = useMemo(() => (metrics ? toChartData(metrics.sessionsPercent) : []), [metrics]);

  if (user?.role !== UserRole.Admin) return null;

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
