import React, { useMemo } from 'react';
import { IncidentSeverity, type SystemIncident } from '../types/bug.types';
import { colors, radius } from '../styles/theme';
import { Card } from './ui/Card';
import { AgentDiagnosisModal } from './AgentDiagnosisModal';
import { useAgentDiagnosis } from '../hooks/useAgentDiagnosis';

interface Props {
  incidents: SystemIncident[];
}

const SEVERITY_BADGE: Record<IncidentSeverity, { label: string; bg: string; text: string }> = {
  [IncidentSeverity.Critical]: { label: 'קריטי', bg: '#7f1d1d', text: '#fca5a5' },
  [IncidentSeverity.High]: { label: 'גבוה', bg: '#78350f', text: '#fde047' },
  [IncidentSeverity.Medium]: { label: 'בינוני', bg: '#1e3a8a', text: '#93c5fd' },
  [IncidentSeverity.Low]: { label: 'נמוך', bg: '#1e293b', text: '#94a3b8' },
};

// תור טריאז' - כל התקלות הפתוחות שעוד לא טופלו, ממוינות לפי חומרה ואז
// לפי הזמן האחרון שבו נראו. המטרה: מקום אחד לסרוק מהר "מה עוד פתוח"
// ולהפעיל את סוכן ה-AI על כל שורה כדי לוודא שזו אכן שגיאה אמיתית (ולא
// רעש חד-פעמי) לפני שמשקיעים בה זמן טיפול
export const UnhandledErrorsPanel: React.FC<Props> = ({ incidents }) => {
  const { runAgent, modalProps } = useAgentDiagnosis();

  const unhandled = useMemo(
    () =>
      incidents
        .filter((i) => !i.isResolved)
        .sort((a, b) => {
          if (b.severity !== a.severity) return b.severity - a.severity;
          return new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime();
        }),
    [incidents]
  );

  if (unhandled.length === 0) {
    return (
      <Card title="שגיאות שטרם טופלו">
        <div style={{ padding: '8px 0', color: colors.successSoft, fontSize: '13px' }}>
          ✓ אין כרגע שגיאות פתוחות שממתינות לבדיקה
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card title={`שגיאות שטרם טופלו (${unhandled.length})`}>
        <p style={{ margin: '0 0 14px 0', fontSize: '12px', color: colors.textFaint }}>
          לפני שפותחים טיפול - לחצו "בדוק עם AI" כדי לקבל ניתוח אוטומטי שמאמת אם זו אכן שגיאה אמיתית, מה הסיבה הסבירה לה, ומה מומלץ לעשות
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {unhandled.map((incident) => {
            const badge = SEVERITY_BADGE[incident.severity];
            return (
              <div
                key={incident.incidentId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 12px',
                  backgroundColor: colors.surface,
                  border: `1px solid ${colors.borderSubtle}`,
                  borderRadius: radius.md,
                }}
              >
                <span
                  style={{
                    flexShrink: 0,
                    padding: '3px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 700,
                    background: badge.bg,
                    color: badge.text,
                  }}
                >
                  {badge.label}
                </span>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 700,
                      color: colors.textPrimary,
                      fontSize: '13px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {incident.hebrewDescription}
                  </div>
                  <div
                    style={{
                      fontSize: '11px',
                      color: colors.textFaint,
                      marginTop: '2px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    #{incident.incidentId} · {incident.subsystem} · {incident.occurrencesCount > 1 ? `× ${incident.occurrencesCount} הופעות · ` : ''}
                    נראה לאחרונה {new Date(incident.lastSeenAt).toLocaleString('he-IL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>

                <button
                  onClick={() => runAgent(incident)}
                  title="הרץ ניתוח AI כדי לוודא שזו שגיאה אמיתית ולקבל המלצת פעולה"
                  style={{
                    flexShrink: 0,
                    padding: '7px 14px',
                    background: 'linear-gradient(135deg, #0284c7, #2563eb)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span>בדוק עם AI</span>
                  <span>🤖</span>
                </button>
              </div>
            );
          })}
        </div>
      </Card>

      <AgentDiagnosisModal {...modalProps} />
    </>
  );
};

export default UnhandledErrorsPanel;
