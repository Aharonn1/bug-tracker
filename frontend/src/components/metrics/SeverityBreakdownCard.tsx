import React, { useMemo } from 'react';
import { IncidentSeverity, type SystemIncident } from '../../types/bug.types';
import { colors } from '../../styles/theme';
import { Card } from '../ui/Card';
import { DonutChart } from '../charts/DonutChart';

interface Props {
  incidents: SystemIncident[];
  selectedSeverity: IncidentSeverity | null;
  onSelectSeverity: (severity: IncidentSeverity | null) => void;
}

const LABEL_TO_SEVERITY: Record<string, IncidentSeverity> = {
  'קריטי': IncidentSeverity.Critical,
  'גבוה': IncidentSeverity.High,
  'בינוני': IncidentSeverity.Medium,
  'נמוך': IncidentSeverity.Low,
};

// כרטיס פילוח חומרה בלבד - דונאט עצמאי. לחיצה על פלח בוחרת את רמת
// החומרה (ה-state עצמו מנוהל ב-IncidentsPage, כמו אצל פילוח המשתמשים)
export const SeverityBreakdownCard: React.FC<Props> = ({ incidents, selectedSeverity, onSelectSeverity }) => {
  const severityData = useMemo(
    () => [
      { label: 'קריטי', value: incidents.filter((i) => i.severity === IncidentSeverity.Critical).length, color: '#ef4444' },
      { label: 'גבוה', value: incidents.filter((i) => i.severity === IncidentSeverity.High).length, color: '#f59e0b' },
      { label: 'בינוני', value: incidents.filter((i) => i.severity === IncidentSeverity.Medium).length, color: '#3b82f6' },
      { label: 'נמוך', value: incidents.filter((i) => i.severity === IncidentSeverity.Low).length, color: '#64748b' },
    ],
    [incidents]
  );

  const selectedLabel = useMemo(
    () => Object.entries(LABEL_TO_SEVERITY).find(([, sev]) => sev === selectedSeverity)?.[0] ?? null,
    [selectedSeverity]
  );

  const handleSegmentClick = (label: string) => {
    const severity = LABEL_TO_SEVERITY[label];
    onSelectSeverity(selectedSeverity === severity ? null : severity);
  };

  return (
    <Card title="פילוח לפי חומרה">
      <p style={{ margin: '0 0 10px 0', fontSize: '12px', color: colors.textFaint }}>
        לחיצה על רמת חומרה מסננת את טבלת התקלות למטה
      </p>
      <DonutChart data={severityData} selectedLabel={selectedLabel} onSegmentClick={handleSegmentClick} />
    </Card>
  );
};

export default SeverityBreakdownCard;
