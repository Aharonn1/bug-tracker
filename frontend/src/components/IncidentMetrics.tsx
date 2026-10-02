import React, { useMemo } from 'react';
import { IncidentSeverity, type SystemIncident } from '../types/bug.types';
import { colors } from '../styles/theme';
import { StatCard } from './ui/StatCard';
import { Card } from './ui/Card';
import { DonutChart } from './charts/DonutChart';
import { TrendAreaChart } from './charts/TrendAreaChart';

interface Props {
  incidents: SystemIncident[];
}

const TREND_DAYS = 14;

function buildTrendData(incidents: SystemIncident[]) {
  const dayCounts = new Map<string, number>();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = TREND_DAYS - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    dayCounts.set(d.toDateString(), 0);
  }

  for (const incident of incidents) {
    const created = new Date(incident.createdAt);
    created.setHours(0, 0, 0, 0);
    const key = created.toDateString();
    if (dayCounts.has(key)) {
      dayCounts.set(key, (dayCounts.get(key) ?? 0) + 1);
    }
  }

  return Array.from(dayCounts.entries()).map(([key, value]) => ({
    label: new Date(key).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' }),
    value,
  }));
}

export const IncidentMetrics: React.FC<Props> = ({ incidents }) => {
  const totalOpen = incidents.filter((i) => !i.isResolved).length;
  const criticalCount = incidents.filter((i) => i.severity === IncidentSeverity.Critical && !i.isResolved).length;
  const netMishpatCount = incidents.filter((i) => i.subsystem === 'NetHaMishpat').length;
  const ecaCount = incidents.filter((i) => i.subsystem === 'EcaGov').length;

  const severityData = useMemo(
    () => [
      { label: 'קריטי', value: incidents.filter((i) => i.severity === IncidentSeverity.Critical).length, color: '#ef4444' },
      { label: 'גבוה', value: incidents.filter((i) => i.severity === IncidentSeverity.High).length, color: '#f59e0b' },
      { label: 'בינוני', value: incidents.filter((i) => i.severity === IncidentSeverity.Medium).length, color: '#3b82f6' },
      { label: 'נמוך', value: incidents.filter((i) => i.severity === IncidentSeverity.Low).length, color: '#64748b' },
    ],
    [incidents]
  );

  const trendData = useMemo(() => buildTrendData(incidents), [incidents]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        <StatCard label="אירועים פתוחים לטיפול" value={totalOpen} valueColor={totalOpen > 0 ? colors.danger : colors.successSoft} />
        <StatCard label="אירועים קריטיים (Level 4)" value={criticalCount} valueColor={criticalCount > 0 ? colors.danger : colors.textMuted} />
        <StatCard label="נט המשפט (שערי תהיל״ה)" value={netMishpatCount} valueColor={colors.accentSoft} />
        <StatCard label="הוצאה לפועל (ECA)" value={ecaCount} valueColor={colors.warningSoft} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) minmax(280px, 1.4fr)', gap: '16px' }}>
        <Card title="פילוח לפי חומרה">
          <DonutChart data={severityData} />
        </Card>
        <Card title={`מגמת תקריות - ${TREND_DAYS} ימים אחרונים`}>
          <TrendAreaChart data={trendData} />
        </Card>
      </div>
    </div>
  );
};

export default IncidentMetrics;
