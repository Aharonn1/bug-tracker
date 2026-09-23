import React, { useState } from 'react';
import { incidentService } from '../api/incidentService';
import { AgentDiagnosisModal } from './AgentDiagnosisModal';
import type { SystemIncident } from '../types/bug.types';

interface Props {
  incidents: SystemIncident[];
  onResolve: (id: number) => void;
}

export const IncidentTable: React.FC<Props> = ({ incidents, onResolve }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [activeIncident, setActiveIncident] = useState<SystemIncident | null>(null);
  const [agentReport, setAgentReport] = useState<string | null>(null);
  const [isDiagnosing, setIsDiagnosing] = useState(false);

  const handleRunAgent = async (incident: SystemIncident) => {
    setActiveIncident(incident);
    setAgentReport(null);
    setIsDiagnosing(true);
    setModalOpen(true);

    try {
      const result = await incidentService.diagnoseWithAgent(incident.incidentId);
      setAgentReport(result.agentReport);
    } catch (err: any) {
      setAgentReport(`שגיאה בהפעלת הסוכן: ${err.message}`);
    } finally {
      setIsDiagnosing(false);
    }
  };

  const getSeverityBadge = (level: number) => {
    switch (level) {
      case 3:
        return <span style={{ background: '#7f1d1d', color: '#fca5a5', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>קריטי (3)</span>;
      case 2:
        return <span style={{ background: '#78350f', color: '#fde047', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>גבוה (2)</span>;
      default:
        return <span style={{ background: '#1e3a8a', color: '#93c5fd', padding: '3px 8px', borderRadius: '4px', fontSize: '11px' }}>בינוני (1)</span>;
    }
  };

  return (
    <>
      <div style={{ overflowX: 'auto', background: '#0f172a', borderRadius: '12px', border: '1px solid #1e293b' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', color: '#cbd5e1', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: '#1e293b', borderBottom: '1px solid #334155' }}>
              <th style={{ padding: '12px' }}>מזהה</th>
              <th style={{ padding: '12px' }}>חומרה</th>
              <th style={{ padding: '12px' }}>מערכת</th>
              <th style={{ padding: '12px' }}>מספר תיק</th>
              <th style={{ padding: '12px' }}>תיאור התקלה</th>
              <th style={{ padding: '12px' }}>הנחיות לפתרון (Playbook)</th>
              <th style={{ padding: '12px' }}>זמן רישום</th>
              <th style={{ padding: '12px' }}>סטטוס</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>פעולות</th>
            </tr>
          </thead>
          <tbody>
            {incidents.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                  אין אירועי תקלות להצגה
                </td>
              </tr>
            ) : (
              incidents.map((i) => {
                const resolved = i.isResolved;
                return (
                  <tr key={i.incidentId} style={{ borderBottom: '1px solid #1e293b', background: resolved ? 'rgba(15, 23, 42, 0.4)' : '#131f37' }}>
                    <td style={{ padding: '12px', fontFamily: 'monospace' }}>#{i.incidentId}</td>
                    <td style={{ padding: '12px' }}>{getSeverityBadge(i.severityLevel)}</td>
                    <td style={{ padding: '12px', fontWeight: 'bold', color: '#38bdf8' }}>{i.subsystem}</td>
                    <td style={{ padding: '12px', fontFamily: 'monospace', color: '#f8fafc' }}>{i.caseNumber || '—'}</td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ fontWeight: 'bold', color: '#fff' }}>{i.hebrewDescription}</div>
                      <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>{i.errorMessage}</div>
                    </td>
                    <td style={{ padding: '12px', fontSize: '12px', color: '#fbbf24', maxWidth: '280px' }}>
                      {i.resolutionPlaybook || '—'}
                    </td>
                    <td style={{ padding: '12px', whiteSpace: 'nowrap', fontSize: '12px' }}>
                      {new Date(i.createdAt).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                    </td>
                    <td style={{ padding: '12px' }}>
                      {resolved ? (
                        <span style={{ color: '#4ade80', fontWeight: 'bold' }}>✓ נפתר</span>
                      ) : (
                        <span style={{ color: '#f87171', fontWeight: 'bold' }}>● פתוח</span>
                      )}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        {/* כפתור חקירת הסוכן */}
                        <button
                          onClick={() => handleRunAgent(i)}
                          title="הפעל סוכן AI לניתוח שורש התקלה"
                          style={{
                            padding: '6px 12px',
                            background: 'linear-gradient(135deg, #0284c7, #2563eb)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontWeight: '600',
                            fontSize: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <span>חקור</span>
                          <span>🤖</span>
                        </button>

                        {!resolved && (
                          <button
                            onClick={() => onResolve(i.incidentId)}
                            style={{
                              padding: '6px 10px',
                              background: '#15803d',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontWeight: '600',
                              fontSize: '12px'
                            }}
                          >
                            פתור
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* מודאל התובנות */}
      <AgentDiagnosisModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        incidentId={activeIncident?.incidentId ?? null}
        caseNumber={activeIncident?.caseNumber ?? null}
        errorCode={activeIncident?.errorCode ?? null}
        report={agentReport}
        isLoading={isDiagnosing}
      />
    </>
  );
};