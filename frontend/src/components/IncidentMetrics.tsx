import React from 'react';
import type { SystemIncident } from '../types/bug.types';

interface Props {
  incidents: SystemIncident[];
}

export const IncidentMetrics: React.FC<Props> = ({ incidents }) => {
  const totalOpen = incidents.filter(i => !i.isResolved).length;
  const criticalCount = incidents.filter(i => i.severityLevel === 3 && !i.isResolved).length;
  const netMishpatCount = incidents.filter(i => i.subsystem === 'NetHaMishpat').length;
  const ecaCount = incidents.filter(i => i.subsystem === 'EcaGov').length;

  const cardStyle: React.CSSProperties = {
    background: '#1e293b',
    padding: '16px 20px',
    borderRadius: '12px',
    border: '1px solid #334155',
    flex: '1',
    minWidth: '200px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  };

  return (
    <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
      <div style={cardStyle}>
        <span style={{ fontSize: '13px', color: '#94a3b8' }}>אירועים פתוחים לטיפול</span>
        <strong style={{ fontSize: '26px', color: totalOpen > 0 ? '#f87171' : '#4ade80' }}>{totalOpen}</strong>
      </div>
      <div style={cardStyle}>
        <span style={{ fontSize: '13px', color: '#94a3b8' }}>אירועים קריטיים (Level 3)</span>
        <strong style={{ fontSize: '26px', color: criticalCount > 0 ? '#ef4444' : '#94a3b8' }}>{criticalCount}</strong>
      </div>
      <div style={cardStyle}>
        <span style={{ fontSize: '13px', color: '#94a3b8' }}>נט המשפט (שערי תהיל״ה)</span>
        <strong style={{ fontSize: '26px', color: '#38bdf8' }}>{netMishpatCount}</strong>
      </div>
      <div style={cardStyle}>
        <span style={{ fontSize: '13px', color: '#94a3b8' }}>הוצאה לפועל (ECA)</span>
        <strong style={{ fontSize: '26px', color: '#facc15' }}>{ecaCount}</strong>
      </div>
    </div>
  );
};