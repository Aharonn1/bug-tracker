import React from 'react';
import { IncidentSeverity, type SystemIncident } from '../../types/bug.types';
import { colors } from '../../styles/theme';
import { StatCard } from '../ui/StatCard';

interface Props {
  incidents: SystemIncident[];
}

// שורת מדדי המפתח העליונה - ארבעה מספרים גדולים, בלי חישוב גרפים
export const KeyMetricsRow: React.FC<Props> = ({ incidents }) => {
  const totalOpen = incidents.filter((i) => !i.isResolved).length;
  const criticalCount = incidents.filter((i) => i.severity === IncidentSeverity.Critical && !i.isResolved).length;
  const netMishpatCount = incidents.filter((i) => i.subsystem === 'NetHaMishpat').length;
  const ecaCount = incidents.filter((i) => i.subsystem === 'EcaGov').length;

  return (
    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
      <StatCard label="אירועים פתוחים לטיפול" value={totalOpen} valueColor={totalOpen > 0 ? colors.danger : colors.successSoft} />
      <StatCard label="אירועים קריטיים (Level 4)" value={criticalCount} valueColor={criticalCount > 0 ? colors.danger : colors.textMuted} />
      <StatCard label="נט המשפט (שערי תהיל״ה)" value={netMishpatCount} valueColor={colors.accentSoft} />
      <StatCard label="הוצאה לפועל (ECA)" value={ecaCount} valueColor={colors.warningSoft} />
    </div>
  );
};

export default KeyMetricsRow;
