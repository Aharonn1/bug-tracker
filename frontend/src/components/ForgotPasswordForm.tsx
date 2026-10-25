import React, { useState } from 'react';
import { authService } from '../api/authService';
import { ApiConnectivityError } from '../api/ApiConnectivityError';
import { reportSilentError } from '../utils/errorReporting';

interface ForgotPasswordFormProps {
  onBackToLogin: () => void;
}

export const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({ onBackToLogin }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setLoading(true);
    try {
      await authService.forgotPassword(email);
      setSubmitted(true);
    } catch (err: any) {
      setLocalError(err.message || 'הבקשה נכשלה - נסה שוב');
      if (err instanceof ApiConnectivityError) {
        reportSilentError('CLIENT_HANDLED_API_FAILURE', err.message, err.stack, { attemptedEmail: email });
      }
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    backgroundColor: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '8px',
    color: '#f8fafc',
    fontSize: '13px',
    marginTop: '6px',
    boxSizing: 'border-box',
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        background: '#1e293b',
        padding: '32px',
        borderRadius: '12px',
        border: '1px solid #334155',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        width: '100%',
        maxWidth: '380px',
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: '4px' }}>
        <h2 style={{ margin: 0, fontSize: '20px', color: '#f8fafc' }}>שחזור סיסמה</h2>
        <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#94a3b8' }}>
          נשלח קישור לאיפוס הסיסמה לכתובת האימייל שלך
        </p>
      </div>

      {submitted ? (
        <div
          style={{
            padding: '14px',
            backgroundColor: '#052e16',
            border: '1px solid #22c55e',
            borderRadius: '8px',
            color: '#4ade80',
            fontSize: '13px',
            lineHeight: 1.6,
            textAlign: 'center',
          }}
        >
          אם קיים חשבון עם הכתובת שהזנת, נשלח אליו מייל עם קישור לאיפוס הסיסמה. בדוק גם בתיקיית הספאם.
        </div>
      ) : (
        <div>
          <label style={{ fontSize: '13px', color: '#94a3b8' }}>אימייל</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@lawfirm.co.il"
            required
            autoFocus
            style={inputStyle}
          />
        </div>
      )}

      {localError && (
        <div
          style={{
            padding: '10px 12px',
            backgroundColor: '#450a0a',
            border: '1px solid #991b1b',
            borderRadius: '8px',
            color: '#fca5a5',
            fontSize: '13px',
          }}
        >
          {localError}
        </div>
      )}

      {!submitted && (
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '12px',
            backgroundColor: '#2563eb',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
            fontSize: '14px',
            marginTop: '8px',
          }}
        >
          {loading ? 'שולח...' : 'שלח קישור לאיפוס'}
        </button>
      )}

      <button
        type="button"
        onClick={onBackToLogin}
        style={{
          padding: '10px',
          backgroundColor: 'transparent',
          color: '#94a3b8',
          border: 'none',
          cursor: 'pointer',
          fontSize: '13px',
        }}
      >
        חזרה למסך ההתחברות
      </button>
    </form>
  );
};
