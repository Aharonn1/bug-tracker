import React, { useMemo } from 'react';
import type { SystemIncident } from '../../types/bug.types';
import { Card } from '../ui/Card';
import { TrendAreaChart } from '../charts/TrendAreaChart';

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

// כרטיס מגמת תקריות בלבד - עצמאי, בונה את נתוני ציר הזמן בעצמו
export const IncidentTrendCard: React.FC<Props> = ({ incidents }) => {
  const trendData = useMemo(() => buildTrendData(incidents), [incidents]);

  return (
    <Card title={`מגמת תקריות - ${TREND_DAYS} ימים אחרונים`}>
      <TrendAreaChart data={trendData} />
    </Card>
  );
};

export default IncidentTrendCard;
