import React, { useMemo } from 'react';
import { IncidentSeverity, type SystemIncident } from '../../types/bug.types';
import { colors } from '../../styles/theme';
import { StatCard } from '../ui/StatCard';
import { METRIC_EXPLANATIONS } from '../../content/metricExplanations';

interface Props {
  incidents: SystemIncident[];
}

// שורת מדדי המפתח העליונה - שני מספרים גדולים, בלי חישוב גרפים. כרטיסי
// נט המשפט/ECA הוסרו - הלקוח הנוכחי לא עובד מול המערכות הממשלתיות האלה,
// אז הכרטיסים תמיד הציגו 0 ולא היו רלוונטיים לתצוגה
export const KeyMetricsRow: React.FC<Props> = ({ incidents }) => {
  // useMemo כי IncidentsPage מרנדר מחדש את זה בכל לחיצת פילטר (חומרה/יום/
  // משתמש) גם כש-incidents עצמו לא השתנה - בלי זה, מעברי filter רצים
  // מחדש בכל לחיצה כזו, לא רק כשהנתונים באמת מתעדכנים
  const { totalOpen, criticalCount } = useMemo(
    () => ({
      totalOpen: incidents.filter((i) => !i.isResolved).length,
      criticalCount: incidents.filter((i) => i.severity === IncidentSeverity.Critical && !i.isResolved).length,
    }),
    [incidents]
  );

  return (
    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
      <StatCard
        label="אירועים פתוחים לטיפול"
        value={totalOpen}
        valueColor={totalOpen > 0 ? colors.danger : colors.successSoft}
        explain={METRIC_EXPLANATIONS.totalOpen}
      />
      <StatCard
        label="אירועים קריטיים (Level 4)"
        value={criticalCount}
        valueColor={criticalCount > 0 ? colors.danger : colors.textMuted}
        explain={METRIC_EXPLANATIONS.criticalCount}
      />
    </div>
  );
};

export default KeyMetricsRow;
