import React, { useMemo } from 'react';
import type { SystemIncident } from '../../types/bug.types';
import { Card } from '../ui/Card';
import { TrendAreaChart } from '../charts/TrendAreaChart';

interface Props {
  incidents: SystemIncident[];
  selectedDay: string | null;
  onSelectDay: (dayKey: string | null) => void;
}

const TREND_DAYS = 14;

export function dayKeyOf(dateIso: string) {
  const d = new Date(dateIso);
  d.setHours(0, 0, 0, 0);
  return d.toDateString();
}

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
    const key = dayKeyOf(incident.createdAt);
    if (dayCounts.has(key)) {
      dayCounts.set(key, (dayCounts.get(key) ?? 0) + 1);
    }
  }

  // label הוא מה שמוצג בגרף (קריא לאדם); dayKey הוא מזהה יציב לסינון -
  // לא תלוי בפורמט תצוגה, כדי למנוע התנגשות בין תאריכים שנראים דומים
  return Array.from(dayCounts.entries()).map(([dayKey, value]) => ({
    label: new Date(dayKey).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' }),
    dayKey,
    value,
  }));
}

// כרטיס מגמת תקריות בלבד - עצמאי, בונה את נתוני ציר הזמן בעצמו. לחיצה על
// נקודה בוחרת את היום (ה-state עצמו מנוהל ב-IncidentsPage)
export const IncidentTrendCard: React.FC<Props> = ({ incidents, selectedDay, onSelectDay }) => {
  const trendData = useMemo(() => buildTrendData(incidents), [incidents]);

  const selectedLabel = useMemo(
    () => trendData.find((d) => d.dayKey === selectedDay)?.label ?? null,
    [trendData, selectedDay]
  );

  const handlePointClick = (label: string) => {
    const point = trendData.find((d) => d.label === label);
    if (!point) return;
    onSelectDay(selectedDay === point.dayKey ? null : point.dayKey);
  };

  return (
    <Card title={`מגמת תקריות - ${TREND_DAYS} ימים אחרונים`}>
      <TrendAreaChart data={trendData} selectedLabel={selectedLabel} onPointClick={handlePointClick} />
    </Card>
  );
};

export default IncidentTrendCard;
