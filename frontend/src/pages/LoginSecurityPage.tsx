import React, { useEffect, useState } from 'react';
import { loginSecurityService } from '../api/loginSecurityService';
import type { BlockedIpSummary, LoginAttemptOutcome, LoginAttemptSummary } from '../types/loginSecurity.types';
import { colors, radius, spacing } from '../styles/theme';
import { SectionHeader } from '../components/ui/SectionHeader';

const OUTCOME_LABELS: Record<LoginAttemptOutcome, { label: string; color: string; bg: string }> = {
  Success: { label: 'התחברות הצליחה', color: colors.successSoft, bg: colors.successBg },
  InvalidCredentials: { label: 'סיסמה שגויה', color: colors.warningSoft, bg: colors.warningBg },
  UnknownEmail: { label: 'אימייל לא קיים', color: colors.warningSoft, bg: colors.warningBg },
  AccountLocked: { label: 'חשבון ננעל', color: colors.dangerSoft, bg: colors.dangerBg },
  IpBlocked: { label: 'נחסם לפי IP', color: colors.dangerSoft, bg: colors.dangerBg },
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('he-IL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

const inputStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: radius.md,
  border: `1px solid ${colors.border}`,
  backgroundColor: colors.surface,
  color: colors.textPrimary,
  fontSize: '13px',
};

export const LoginSecurityPage: React.FC = () => {
  const [attempts, setAttempts] = useState<LoginAttemptSummary[] | null>(null);
  const [blockedIps, setBlockedIps] = useState<BlockedIpSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyIp, setBusyIp] = useState<string | null>(null);

  const [manualIp, setManualIp] = useState('');
  const [manualHours, setManualHours] = useState('24');

  const load = async () => {
    try {
      setLoading(true);
      const [attemptsResult, blockedResult] = await Promise.all([
        loginSecurityService.getAttempts(),
        loginSecurityService.getBlockedIps(),
      ]);
      setAttempts(attemptsResult);
      setBlockedIps(blockedResult);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'כשל בטעינת נתוני אבטחת ההתחברות');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleUnblock = async (ip: string) => {
    setBusyIp(ip);
    try {
      await loginSecurityService.unblock(ip);
      setBlockedIps((cur) => cur?.filter((b) => b.ipAddress !== ip) ?? cur);
    } catch (err: any) {
      setError(err.message || 'כשל בביטול חסימה');
    } finally {
      setBusyIp(null);
    }
  };

  const handleManualBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    const ip = manualIp.trim();
    const hours = Number(manualHours) || 24;
    if (!ip) return;

    setBusyIp(ip);
    try {
      await loginSecurityService.block(ip, hours);
      setManualIp('');
      await load();
    } catch (err: any) {
      setError(err.message || 'כשל בחסימה ידנית');
    } finally {
      setBusyIp(null);
    }
  };

  if (loading) {
    return (
      <section>
        <SectionHeader title="אבטחת כניסה" subtitle="ניסיונות התחברות וחסימות IP אוטומטיות וידניות" />
        <p style={{ color: colors.textMuted, fontSize: '13px' }}>טוען...</p>
      </section>
    );
  }

  if (error || !attempts || !blockedIps) {
    return (
      <section>
        <SectionHeader title="אבטחת כניסה" subtitle="ניסיונות התחברות וחסימות IP אוטומטיות וידניות" />
        <div style={{ padding: spacing.lg, backgroundColor: colors.dangerBg, border: `1px solid ${colors.dangerBorder}`, borderRadius: radius.md, color: colors.dangerSoft, fontSize: '13px' }}>
          {error ?? 'שגיאה לא צפויה'}
          {error?.includes('403') && ' - עמוד זה זמין רק למנהל-העל (SiteAdmin).'}
        </div>
      </section>
    );
  }

  return (
    <section>
      <SectionHeader
        title="אבטחת כניסה"
        subtitle="חסימה אוטומטית מופעלת כש-IP אחד גורם לנעילת כמה חשבונות שונים תוך 24 שעות. אפשר גם לחסום/לבטל חסימה ידנית"
      />

      <div style={{ marginBottom: spacing.lg }}>
        <h3 style={{ fontSize: '14px', color: colors.textPrimary, marginBottom: spacing.sm }}>כתובות IP חסומות</h3>

        <form onSubmit={handleManualBlock} style={{ display: 'flex', gap: spacing.sm, alignItems: 'center', marginBottom: spacing.md, flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="כתובת IP לחסימה ידנית"
            value={manualIp}
            onChange={(e) => setManualIp(e.target.value)}
            style={{ ...inputStyle, minWidth: '180px' }}
          />
          <input
            type="number"
            min={1}
            max={720}
            value={manualHours}
            onChange={(e) => setManualHours(e.target.value)}
            style={{ ...inputStyle, width: '90px' }}
          />
          <span style={{ fontSize: '12.5px', color: colors.textFaint }}>שעות</span>
          <button
            type="submit"
            disabled={!manualIp.trim() || busyIp === manualIp.trim()}
            style={{
              padding: '8px 16px',
              borderRadius: radius.md,
              border: 'none',
              backgroundColor: colors.danger,
              color: '#fff',
              fontSize: '12.5px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            חסום ידנית
          </button>
        </form>

        {blockedIps.length === 0 ? (
          <p style={{ color: colors.textFaint, fontSize: '13px' }}>👍 אין כתובות IP חסומות כרגע</p>
        ) : (
          <div style={{ overflowX: 'auto', background: colors.surface, borderRadius: radius.lg, border: `1px solid ${colors.borderSubtle}` }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', color: colors.textSecondary, fontSize: '12.5px' }}>
              <thead>
                <tr style={{ background: colors.card, borderBottom: `1px solid ${colors.border}` }}>
                  <th style={{ padding: '10px 12px' }}>כתובת IP</th>
                  <th style={{ padding: '10px 12px' }}>סיבה</th>
                  <th style={{ padding: '10px 12px' }}>חסום עד</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center' }}>פעולה</th>
                </tr>
              </thead>
              <tbody>
                {blockedIps.map((b, idx) => (
                  <tr key={b.id} style={{ borderBottom: `1px solid ${colors.borderSubtle}`, backgroundColor: idx % 2 === 1 ? colors.surfaceRaised : 'transparent' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 600, color: colors.textPrimary, fontVariantNumeric: 'tabular-nums' }}>{b.ipAddress}</td>
                    <td style={{ padding: '10px 12px', color: colors.dangerSoft }}>{b.reason}</td>
                    <td style={{ padding: '10px 12px', whiteSpace: 'nowrap', fontSize: '11.5px', color: colors.textFaint }}>{formatDate(b.blockedUntil)}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      <button
                        onClick={() => handleUnblock(b.ipAddress)}
                        disabled={busyIp === b.ipAddress}
                        style={{
                          padding: '6px 14px',
                          borderRadius: radius.md,
                          border: 'none',
                          backgroundColor: colors.accent,
                          color: '#fff',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: busyIp === b.ipAddress ? 'default' : 'pointer',
                          opacity: busyIp === b.ipAddress ? 0.6 : 1,
                        }}
                      >
                        {busyIp === b.ipAddress ? 'מבטל...' : 'בטל חסימה'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div>
        <h3 style={{ fontSize: '14px', color: colors.textPrimary, marginBottom: spacing.sm }}>ניסיונות התחברות אחרונים</h3>

        {attempts.length === 0 ? (
          <p style={{ color: colors.textFaint, fontSize: '13px' }}>אין ניסיונות התחברות מתועדים עדיין</p>
        ) : (
          <div style={{ overflowX: 'auto', background: colors.surface, borderRadius: radius.lg, border: `1px solid ${colors.borderSubtle}` }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', color: colors.textSecondary, fontSize: '12.5px' }}>
              <thead>
                <tr style={{ background: colors.card, borderBottom: `1px solid ${colors.border}` }}>
                  <th style={{ padding: '10px 12px' }}>אימייל</th>
                  <th style={{ padding: '10px 12px' }}>כתובת IP</th>
                  <th style={{ padding: '10px 12px' }}>לקוח</th>
                  <th style={{ padding: '10px 12px' }}>תוצאה</th>
                  <th style={{ padding: '10px 12px' }}>זמן</th>
                </tr>
              </thead>
              <tbody>
                {attempts.map((a, idx) => {
                  const outcome = OUTCOME_LABELS[a.outcome];
                  return (
                    <tr key={a.id} style={{ borderBottom: `1px solid ${colors.borderSubtle}`, backgroundColor: idx % 2 === 1 ? colors.surfaceRaised : 'transparent' }}>
                      <td style={{ padding: '10px 12px', color: colors.textPrimary }}>{a.email || '—'}</td>
                      <td style={{ padding: '10px 12px', fontVariantNumeric: 'tabular-nums' }}>{a.ipAddress}</td>
                      <td style={{ padding: '10px 12px', color: colors.accentSoft }}>{a.tenantId ?? '—'}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{
                          fontSize: '10.5px',
                          fontWeight: 700,
                          padding: '3px 9px',
                          borderRadius: '999px',
                          backgroundColor: outcome.bg,
                          color: outcome.color,
                        }}>
                          {outcome.label}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', whiteSpace: 'nowrap', fontSize: '11.5px', color: colors.textFaint }}>{formatDate(a.attemptedAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
};

export default LoginSecurityPage;
