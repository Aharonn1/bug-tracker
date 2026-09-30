import React from 'react';
import type { SystemIncident } from '../types/bug.types';

interface Props {
  incident: SystemIncident | null;
  onClose: () => void;
}

function parseRawPayload(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : null;
  } catch {
    return null;
  }
}

export const IncidentDetailsModal: React.FC<Props> = ({ incident, onClose }) => {
  if (!incident) return null;

  const payload = parseRawPayload(incident.rawPayload);
  const attemptedEmail = typeof payload?.attemptedEmail === 'string' ? payload.attemptedEmail : null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        direction: 'rtl',
        backdropFilter: 'blur(4px)',
        padding: '20px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#0f172a',
          border: '1px solid #334155',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '640px',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid #1e293b',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#1e293b',
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', color: '#f8fafc', fontWeight: 600 }}>
              {incident.hebrewDescription}
            </h3>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>
              תקלה #{incident.incidentId} · {incident.subsystem} · {incident.errorCode}
            </span>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer', padding: '4px 8px' }}
          >
            ✕
          </button>
        </div>

        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <section>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, marginBottom: '6px' }}>הודעת שגיאה</div>
            <div style={{ background: '#131f37', padding: '12px', borderRadius: '8px', border: '1px solid #1e293b', color: '#e2e8f0', fontSize: '13px', fontFamily: 'monospace' }}>
              {incident.errorMessage}
            </div>
          </section>

          {incident.resolutionPlaybook && (
            <section>
              <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, marginBottom: '6px' }}>הנחיות לפתרון (Playbook)</div>
              <div style={{ background: '#131f37', padding: '14px', borderRadius: '8px', border: '1px solid #1e293b', color: '#fde68a', fontSize: '13px', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                {incident.resolutionPlaybook}
              </div>
            </section>
          )}

          {attemptedEmail && (
            <section>
              <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, marginBottom: '6px' }}>
                אימייל שניסה להתחבר בזמן התקלה
              </div>
              <div style={{
                background: '#450a0a',
                border: '1px solid #991b1b',
                borderRadius: '8px',
                padding: '10px 12px',
                color: '#fca5a5',
                fontSize: '13px',
                fontFamily: 'monospace',
              }}>
                {attemptedEmail}
              </div>
              <div style={{ color: '#64748b', fontSize: '11px', marginTop: '4px' }}>
                נלכד לפני שהיה למשתמש חשבון מחובר - זה מה שהוא הקליד, לא זהות מאומתת
              </div>
            </section>
          )}

          <section>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, marginBottom: '6px' }}>
              משתמשים שנתקלו בתקלה ({incident.reportedByUsers.length})
            </div>
            {incident.reportedByUsers.length === 0 ? (
              <div style={{ color: '#64748b', fontSize: '13px' }}>
                {attemptedEmail ? 'אף חשבון מחובר לא נתקל בתקלה - ראו את האימייל שהוקלד למעלה' : 'לא זוהה משתמש מחובר עבור תקלה זו'}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {incident.reportedByUsers.map((r) => (
                  <div
                    key={r.userId}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: '#131f37',
                      border: '1px solid #1e293b',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      fontSize: '13px',
                    }}
                  >
                    <span style={{ color: '#e2e8f0' }}>{r.userName}</span>
                    <span style={{ color: '#94a3b8', fontSize: '12px' }}>
                      {r.occurrenceCount} פעמים · לאחרונה {new Date(r.lastSeenAt).toLocaleString('he-IL')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div style={{ padding: '12px 24px', borderTop: '1px solid #1e293b', display: 'flex', justifyContent: 'flex-end', background: '#0b0f19' }}>
          <button
            onClick={onClose}
            style={{ padding: '8px 18px', background: '#334155', color: '#f8fafc', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}
          >
            סגור
          </button>
        </div>
      </div>
    </div>
  );
};

export default IncidentDetailsModal;
