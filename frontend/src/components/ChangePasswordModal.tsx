import React, { useState } from 'react';
import { colors } from '../styles/theme';
import { userService } from '../api/userService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const ChangePasswordModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleClose = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError(null);
    setSuccess(false);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 12) {
      setError('הסיסמה החדשה חייבת להכיל לפחות 12 תווים');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('אימות הסיסמה אינו תואם לסיסמה החדשה');
      return;
    }

    setLoading(true);
    try {
      await userService.changePassword(currentPassword, newPassword);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'שינוי הסיסמה נכשל');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '8px',
    border: `1px solid ${colors.border}`,
    backgroundColor: colors.surface,
    color: colors.textPrimary,
    fontSize: '14px',
    boxSizing: 'border-box',
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, direction: 'rtl', backdropFilter: 'blur(4px)',
    }}>
      <div style={{
        backgroundColor: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: '16px',
        width: '90%',
        maxWidth: '420px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '16px 24px',
          borderBottom: `1px solid ${colors.borderSubtle}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: colors.card,
        }}>
          <h3 style={{ margin: 0, fontSize: '16px', color: colors.textPrimary, fontWeight: 600 }}>שינוי סיסמה</h3>
          <button
            onClick={handleClose}
            style={{ background: 'transparent', border: 'none', color: colors.textMuted, fontSize: '20px', cursor: 'pointer', padding: '4px 8px' }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {success ? (
            <div style={{ textAlign: 'center', padding: '12px 0' }}>
              <div style={{ fontSize: '28px', marginBottom: '8px' }}>✅</div>
              <div style={{ color: colors.success, fontWeight: 600, fontSize: '14px' }}>הסיסמה שונתה בהצלחה</div>
              <button
                type="button"
                onClick={handleClose}
                style={{
                  marginTop: '16px', padding: '8px 20px', borderRadius: '8px', border: 'none',
                  backgroundColor: colors.accent, color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                }}
              >
                סגור
              </button>
            </div>
          ) : (
            <>
              <label style={{ fontSize: '12.5px', color: colors.textMuted, fontWeight: 600 }}>
                סיסמה נוכחית
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  autoFocus
                  style={{ ...inputStyle, marginTop: '6px' }}
                />
              </label>
              <label style={{ fontSize: '12.5px', color: colors.textMuted, fontWeight: 600 }}>
                סיסמה חדשה (לפחות 12 תווים)
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={12}
                  style={{ ...inputStyle, marginTop: '6px' }}
                />
              </label>
              <label style={{ fontSize: '12.5px', color: colors.textMuted, fontWeight: 600 }}>
                אימות סיסמה חדשה
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  style={{ ...inputStyle, marginTop: '6px' }}
                />
              </label>

              {error && (
                <div style={{
                  fontSize: '12.5px', color: colors.dangerSoft, backgroundColor: colors.dangerBg,
                  border: `1px solid ${colors.dangerBorder}`, borderRadius: '8px', padding: '8px 12px',
                }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  marginTop: '6px', padding: '10px', borderRadius: '8px', border: 'none',
                  backgroundColor: colors.accent, color: '#fff', fontSize: '13.5px', fontWeight: 600,
                  cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? 'משנה סיסמה...' : 'שנה סיסמה'}
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
};
