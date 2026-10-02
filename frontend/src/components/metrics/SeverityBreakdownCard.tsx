import React, { useMemo } from 'react';
import { IncidentSeverity, type SystemIncident } from '../../types/bug.types';
import { Card } from '../ui/Card';
import { DonutChart } from '../charts/DonutChart';

interface Props {
  incidents: SystemIncident[];
}

// כרטיס פילוח חומרה בלבד - דונאט עצמאי, לא יודע כלום על שאר המדדים
export const SeverityBreakdownCard: React.FC<Props> = ({ incidents }) => {
  const severityData = useMemo(
    () => [
      { label: 'קריטי', value: incidents.filter((i) => i.severity === IncidentSeverity.Critical).length, color: '#ef4444' },
      { label: 'גבוה', value: incidents.filter((i) => i.severity === IncidentSeverity.High).length, color: '#f59e0b' },
      { label: 'בינוני', value: incidents.filter((i) => i.severity === IncidentSeverity.Medium).length, color: '#3b82f6' },
      { label: 'נמוך', value: incidents.filter((i) => i.severity === IncidentSeverity.Low).length, color: '#64748b' },
    ],
    [incidents]
  );

  return (
    <Card title="פילוח לפי חומרה">
      <DonutChart data={severityData} />
    </Card>
  );
};

export default SeverityBreakdownCard;
