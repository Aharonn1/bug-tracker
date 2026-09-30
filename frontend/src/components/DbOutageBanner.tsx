import React, { useState } from 'react';
import { useDbOutageLog } from '../hooks/useDbOutageLog';

// גלוי לכולם (לא רק Admin) כי זו תקלת תשתית שמשפיעה על כל מי שמשתמש במערכת
// באותו רגע, לא סינון פרטי לפי משתמש
export const DbOutageBanner: React.FC = () => {
  const { entries } = useDbOutageLog();
  const [expanded, setExpanded] = useState(false);

  if (entries.length === 0) return null;

  const latest = entries[entries.length - 1];

  return (
    <div
      style={{
        padding: '14px 16px',
        backgroundColor: '#450a0a',
        border: '1px solid #991b1b',
        borderRadius: '10px',
        marginBottom: '20px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <span
          style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            backgroundColor: '#ef4444',
            marginTop: '4px',
            flexShrink: 0,
            animation: 'pulse 1.8s infinite',
          }}
        />
        <div style={{ flex: 1 }}>
          <div style={{ color: '#fca5a5', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>
            אין גישה לבסיס הנתונים - זוהו {entries.length} תקלות זמינות מאז הטעינה האחרונה
          </div>
          <div style={{ color: '#cbd5e1', fontSize: '13px', lineHeight: 1.6 }}>
            {latest.exceptionType}: {latest.message}
          </div>
          <div style={{ color: '#94a3b8', fontSize: '11px', marginTop: '4px' }}>
            נראה לאחרונה: {new Date(latest.occurredAt).toLocaleString('he-IL')} · הרשומות האלה יישמרו כתקריות קבועות אוטומטית ברגע שהחיבור יחזור
          </div>
        </div>
        <button
          onClick={() => setExpanded((v) => !v)}
          style={{
            backgroundColor: 'transparent',
            border: '1px solid #991b1b',
            color: '#fca5a5',
            borderRadius: '6px',
            padding: '6px 10px',
            fontSize: '12px',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          {expanded ? 'הסתר פירוט' : 'הצג הכל'}
        </button>
      </div>

      {expanded && (
        <div style={{ marginTop: '12px', marginRight: '22px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {entries.map((entry, i) => (
            <div
              key={i}
              style={{
                background: 'rgba(0,0,0,0.2)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '8px',
                padding: '8px 10px',
                fontSize: '12px',
                color: '#e2e8f0',
              }}
            >
              <span style={{ color: '#94a3b8' }}>{new Date(entry.occurredAt).toLocaleString('he-IL')}</span>
              {' · '}
              <span style={{ fontFamily: 'monospace' }}>{entry.requestPath}</span>
              {' — '}
              {entry.exceptionType}: {entry.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DbOutageBanner;
