import React, { useState } from 'react';
import { authService } from '../api/authService';

interface ResetPasswordFormProps {
  token: string;
  onDone: () => void;
}

export const ResetPasswordForm: React.FC<ResetPasswordFormProps> = ({ token, onDone }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (newPassword.length < 12) {
      setLocalError('הסיסמה החדשה חייבת להכיל לפחות 12 תווים');
      return;
    }
    if (newPassword !== confirmPassword) {
      setLocalError('אימות הסיסמה אינו תואם לסיסמה החדשה');
      return;
    }

    setLoading(true);
    try {
      await authService.resetPassword(token, newPassword);
      setSuccess(true);
    } catch (err: any) {
      setLocalError(err.message || 'איפוס הסיסמה נכשל');
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
        <h2 style={{ margin: 0, fontSize: '20px', color: '#f8fafc' }}>בחירת סיסמה חדשה</h2>
      </div>

      {success ? (
        <>
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
            הסיסמה שונתה בהצלחה. אפשר להתחבר עם הסיסמה החדשה.
          </div>
          <button
            type="button"
            onClick={onDone}
            style={{
              padding: '12px',
              backgroundColor: '#2563eb',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '14px',
            }}
          >
            למסך ההתחברות
          </button>
        </>
      ) : (
        <>
          <div>
            <label style={{ fontSize: '13px', color: '#94a3b8' }}>סיסמה חדשה (לפחות 12 תווים)</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={12}
              autoFocus
              style={inputStyle}
            />
          </div>

          <div>
            <label style={{ fontSize: '13px', color: '#94a3b8' }}>אימות סיסמה חדשה</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
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
            {loading ? 'מאפס סיסמה...' : 'אפס סיסמה'}
          </button>
        </>
      )}
    </form>
  );
};
