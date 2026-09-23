import React from 'react';
import ReactMarkdown from 'react-markdown';

const markdownComponents = {
  h1: (props: React.ComponentProps<'h1'>) => (
    <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc', margin: '16px 0 8px' }} {...props} />
  ),
  h2: (props: React.ComponentProps<'h2'>) => (
    <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#f8fafc', margin: '16px 0 8px' }} {...props} />
  ),
  h3: (props: React.ComponentProps<'h3'>) => (
    <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#38bdf8', margin: '14px 0 6px' }} {...props} />
  ),
  p: (props: React.ComponentProps<'p'>) => (
    <p style={{ margin: '0 0 10px', lineHeight: 1.7 }} {...props} />
  ),
  strong: (props: React.ComponentProps<'strong'>) => (
    <strong style={{ color: '#f8fafc', fontWeight: 700 }} {...props} />
  ),
  ul: (props: React.ComponentProps<'ul'>) => (
    <ul style={{ margin: '0 0 10px', paddingRight: '20px' }} {...props} />
  ),
  ol: (props: React.ComponentProps<'ol'>) => (
    <ol style={{ margin: '0 0 10px', paddingRight: '20px' }} {...props} />
  ),
  li: (props: React.ComponentProps<'li'>) => (
    <li style={{ marginBottom: '4px', lineHeight: 1.7 }} {...props} />
  ),
  code: (props: React.ComponentProps<'code'>) => (
    <code style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '4px', padding: '1px 5px', fontSize: '12px', color: '#fbbf24' }} {...props} />
  ),
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  incidentId: number | null;
  caseNumber: string | null;
  errorCode: string | null;
  report: string | null;
  isLoading: boolean;
}

export const AgentDiagnosisModal: React.FC<Props> = ({
  isOpen,
  onClose,
  incidentId,
  caseNumber,
  errorCode,
  report,
  isLoading
}) => {
  if (!isOpen) return null;

  return (
    <div style={{
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
      backdropFilter: 'blur(4px)'
    }}>
      <div style={{
        backgroundColor: '#0f172a',
        border: '1px solid #334155',
        borderRadius: '16px',
        width: '90%',
        maxWidth: '680px',
        maxHeight: '85vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid #1e293b',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#1e293b'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '20px' }}>🤖</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', color: '#f8fafc', fontWeight: 600 }}>
                דו״ח חקירה אוטונומי (RCA Agent)
              </h3>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                אירוע #{incidentId} {errorCode && `| קוד: ${errorCode}`} {caseNumber && `| תיק: ${caseNumber}`}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              fontSize: '20px',
              cursor: 'pointer',
              padding: '4px 8px'
            }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1, color: '#e2e8f0', fontSize: '14px', lineHeight: '1.7' }}>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div style={{
                width: '36px',
                height: '36px',
                border: '3px solid #334155',
                borderTop: '3px solid #38bdf8',
                borderRadius: '50%',
                margin: '0 auto 16px auto',
                animation: 'spin 1s linear infinite'
              }} />
              <div style={{ fontWeight: 600, color: '#38bdf8' }}>סוכן ה-AI סורק את המערכת...</div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '6px' }}>
                מפעיל בדיקות שער תהיל״ה, סורק נעילות קבצים ומצליב StackTrace
              </div>
            </div>
          ) : (
            <div style={{ background: '#131f37', padding: '16px', borderRadius: '8px', border: '1px solid #1e293b' }}>
              <ReactMarkdown components={markdownComponents}>{report}</ReactMarkdown>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 24px',
          borderTop: '1px solid #1e293b',
          display: 'flex',
          justifyContent: 'flex-end',
          background: '#0b0f19'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 18px',
              background: '#334155',
              color: '#f8fafc',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '13px'
            }}
          >
            סגור
          </button>
        </div>
      </div>
    </div>
  );
};