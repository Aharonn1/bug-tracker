import React from 'react';
import { incidentService } from '../api/incidentService';
import { TENANT_ID } from '../config';

interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
  reported: boolean;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null, reported: false };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    incidentService
      .create({
        tenantId: TENANT_ID,
        errorCode: 'CLIENT_JS_CRASH',
        errorMessage: error.message || 'שגיאת JavaScript לא מזוהה בצד הלקוח',
        stackTrace: error.stack ?? null,
        rawPayload: JSON.stringify({
          componentStack: info.componentStack,
          url: window.location.href,
          userAgent: navigator.userAgent,
        }),
      })
      .then(() => this.setState({ reported: true }))
      .catch(() => {
        // אם גם דיווח התקלה נכשל (למשל השרת עצמו לא זמין), אין מה לעשות
        // מעבר להצגת המסך הידידותי - לפחות המשתמש לא נשאר מול מסך לבן
      });
  }

  render() {
    const { error, reported } = this.state;

    if (!error) return this.props.children;

    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0b0f19',
          direction: 'rtl',
          padding: '24px',
        }}
      >
        <div
          style={{
            maxWidth: '480px',
            width: '100%',
            backgroundColor: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '14px',
            padding: '28px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>⚠️</div>
          <h1 style={{ margin: '0 0 8px', fontSize: '18px', color: '#f8fafc' }}>
            משהו השתבש בעמוד
          </h1>
          <p style={{ margin: '0 0 20px', fontSize: '13px', color: '#94a3b8', lineHeight: 1.7 }}>
            אירעה שגיאה בלתי צפויה בצד הדפדפן. {reported ? 'התקלה דווחה אוטומטית לצוות התמיכה.' : 'מנסים לדווח את התקלה...'}
            {' '}הנתונים שמילאת בטופס עדיין עשויים להישמר — מומלץ לרענן את הדף.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              backgroundColor: '#2563eb',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            רענן את הדף
          </button>

          <details style={{ marginTop: '20px', textAlign: 'right' }}>
            <summary style={{ color: '#64748b', fontSize: '12px', cursor: 'pointer' }}>
              פרטים טכניים
            </summary>
            <pre
              style={{
                marginTop: '10px',
                padding: '10px',
                backgroundColor: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '8px',
                color: '#94a3b8',
                fontSize: '11px',
                overflowX: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {error.message}
              {error.stack ? `\n\n${error.stack}` : ''}
            </pre>
          </details>
        </div>
      </div>
    );
  }
}
