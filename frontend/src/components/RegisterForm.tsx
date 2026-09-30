import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { ApiConnectivityError } from '../api/ApiConnectivityError';
import { reportSilentError } from '../utils/errorReporting';

interface RegisterFormProps {
  onSwitchToLogin: () => void;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({ onSwitchToLogin }) => {
  const { register, loading } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (password.length < 8) {
      setLocalError('הסיסמה חייבת להכיל לפחות 8 תווים');
      return;
    }

    try {
      await register({ fullName, email, password });
    } catch (err: any) {
      setLocalError(err.message || 'כשל בהרשמה למערכת');

      // כשל תקשורתי (אין חיבור לשרת/לענן) הוא בעיה שלנו, לא של המשתמש -
      // מדווחים עליו בשקט. אימייל כפול/ולידציה הם תגובה צפויה ולא מדווחים
      if (err instanceof ApiConnectivityError) {
        reportSilentError('CLIENT_HANDLED_API_FAILURE', err.message, err.stack, { attemptedEmail: email, attemptedFullName: fullName });
      }
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
        <h2 style={{ margin: 0, fontSize: '20px', color: '#f8fafc' }}>הרשמה למערכת</h2>
        <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#94a3b8' }}>
          יצירת חשבון משתמש חדש
        </p>
      </div>

      <div>
        <label style={{ fontSize: '13px', color: '#94a3b8' }}>שם מלא</label>
        <input
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="ישראל ישראלי"
          required
          style={inputStyle}
        />
      </div>

      <div>
        <label style={{ fontSize: '13px', color: '#94a3b8' }}>אימייל</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@lawfirm.co.il"
          required
          style={inputStyle}
        />
      </div>

      <div>
        <label style={{ fontSize: '13px', color: '#94a3b8' }}>סיסמה</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="לפחות 8 תווים"
          required
          minLength={8}
          style={inputStyle}
        />
      </div>

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
        {loading ? 'נרשם...' : 'הרשם'}
      </button>

      <button
        type="button"
        onClick={onSwitchToLogin}
        style={{
          padding: '10px',
          backgroundColor: 'transparent',
          color: '#94a3b8',
          border: 'none',
          cursor: 'pointer',
          fontSize: '13px',
        }}
      >
        כבר יש לך חשבון? התחברות
      </button>
    </form>
  );
};

export default RegisterForm;
