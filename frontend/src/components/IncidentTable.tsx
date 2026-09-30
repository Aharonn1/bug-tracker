import React, { useState } from 'react';
import { incidentService } from '../api/incidentService';
import { AgentDiagnosisModal } from './AgentDiagnosisModal';
import { IncidentDetailsModal } from './IncidentDetailsModal';
import { IncidentSeverity, type SystemIncident } from '../types/bug.types';

interface Props {
  incidents: SystemIncident[];
  onResolve: (id: number) => void;
}

function extractAttemptedEmail(rawPayload: string | null): string | null {
  if (!rawPayload) return null;
  try {
    const parsed = JSON.parse(rawPayload);
    return typeof parsed?.attemptedEmail === 'string' ? parsed.attemptedEmail : null;
  } catch {
    return null;
  }
}

export const IncidentTable: React.FC<Props> = ({ incidents, onResolve }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [activeIncident, setActiveIncident] = useState<SystemIncident | null>(null);
  const [agentReport, setAgentReport] = useState<string | null>(null);
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [detailsIncident, setDetailsIncident] = useState<SystemIncident | null>(null);

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
      case IncidentSeverity.Critical:
        return <span style={{ background: '#7f1d1d', color: '#fca5a5', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>קריטי (4)</span>;
      case IncidentSeverity.High:
        return <span style={{ background: '#78350f', color: '#fde047', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>גבוה (3)</span>;
      case IncidentSeverity.Medium:
        return <span style={{ background: '#1e3a8a', color: '#93c5fd', padding: '3px 8px', borderRadius: '4px', fontSize: '11px' }}>בינוני (2)</span>;
      default:
        return <span style={{ background: '#1e293b', color: '#94a3b8', padding: '3px 8px', borderRadius: '4px', fontSize: '11px' }}>נמוך (1)</span>;
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
              <th style={{ padding: '12px', textAlign: 'center' }}>הופעות</th>
              <th style={{ padding: '12px' }}>זמן רישום</th>
              <th style={{ padding: '12px' }}>דווח על ידי</th>
              <th style={{ padding: '12px' }}>סטטוס</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>פעולות</th>
            </tr>
          </thead>
          <tbody>
            {incidents.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                  אין אירועי תקלות להצגה
                </td>
              </tr>
            ) : (
              incidents.map((i) => {
                const resolved = i.isResolved;
                return (
                  <tr key={i.incidentId} style={{ borderBottom: '1px solid #1e293b', background: resolved ? 'rgba(15, 23, 42, 0.4)' : '#131f37' }}>
                    <td style={{ padding: '12px', fontFamily: 'monospace' }}>#{i.incidentId}</td>
                    <td style={{ padding: '12px' }}>{getSeverityBadge(i.severity)}</td>
                    <td style={{ padding: '12px', fontWeight: 'bold', color: '#38bdf8' }}>{i.subsystem}</td>
                    <td style={{ padding: '12px', fontFamily: 'monospace', color: '#f8fafc' }}>{i.caseNumber || '—'}</td>
                    <td style={{ padding: '12px', maxWidth: '320px' }}>
                      <div style={{
                        fontWeight: 'bold',
                        color: '#fff',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {i.hebrewDescription}
                      </div>
                      <div style={{
                        fontSize: '11px',
                        color: '#94a3b8',
                        marginTop: '2px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {i.errorMessage}
                      </div>
                      <button
                        onClick={() => setDetailsIncident(i)}
                        style={{
                          marginTop: '6px',
                          padding: '3px 9px',
                          background: 'transparent',
                          border: '1px solid #334155',
                          borderRadius: '6px',
                          color: '#94a3b8',
                          fontSize: '11px',
                          cursor: 'pointer',
                        }}
                      >
                        פרטים והנחיות ›
                      </button>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <span
                        title={`נראה לאחרונה: ${new Date(i.lastSeenAt).toLocaleString('he-IL')}`}
                        style={{
                          display: 'inline-block',
                          minWidth: '28px',
                          padding: '3px 8px',
                          borderRadius: '999px',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          background: i.occurrencesCount > 1 ? '#78350f' : '#1e293b',
                          color: i.occurrencesCount > 1 ? '#fde047' : '#94a3b8',
                        }}
                      >
                        × {i.occurrencesCount}
                      </span>
                    </td>
                    <td style={{ padding: '12px', whiteSpace: 'nowrap', fontSize: '12px' }}>
                      {new Date(i.createdAt).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                    </td>
                    <td style={{ padding: '12px', fontSize: '12px' }}>
                      {i.reportedByUsers.length === 0 ? (
                        extractAttemptedEmail(i.rawPayload) ? (
                          <span style={{ color: '#fca5a5' }} title="אימייל שהוקלד בניסיון התחברות, לפני שהייתה זהות מאומתת">
                            {extractAttemptedEmail(i.rawPayload)}
                          </span>
                        ) : (
                          <span style={{ color: '#64748b' }}>לא מזוהה</span>
                        )
                      ) : i.reportedByUsers.length === 1 ? (
                        <span style={{ color: '#e2e8f0', whiteSpace: 'nowrap' }}>
                          {i.reportedByUsers[0].userName}
                          {i.reportedByUsers[0].occurrenceCount > 1 && (
                            <span style={{ color: '#94a3b8' }}> ×{i.reportedByUsers[0].occurrenceCount}</span>
                          )}
                        </span>
                      ) : (
                        <span
                          title={i.reportedByUsers.map((r) => `${r.userName} — ${r.occurrenceCount} פעמים`).join('\n')}
                          style={{
                            display: 'inline-block',
                            padding: '3px 9px',
                            borderRadius: '999px',
                            background: '#1e293b',
                            color: '#e2e8f0',
                            fontSize: '11px',
                            fontWeight: 600,
                            whiteSpace: 'nowrap',
                            cursor: 'default',
                          }}
                        >
                          {i.reportedByUsers.length} משתמשים
                        </span>
                      )}
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

      <IncidentDetailsModal
        incident={detailsIncident}
        onClose={() => setDetailsIncident(null)}
      />
    </>
  );
};