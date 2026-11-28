import React, { useMemo, useState } from 'react';
import { useLoginSecurity } from '../hooks/useLoginSecurity';
import type { LoginAttemptSummary, LoginAttemptOutcome } from '../types/loginSecurity.types';
import { colors, radius, spacing } from '../styles/theme';
import { SectionHeader } from '../components/ui/SectionHeader';
import { InfoButton } from '../components/ui/InfoButton';
import { MetricInfoModal, type MetricExplain } from '../components/ui/MetricInfoModal';
import { StatCard } from '../components/ui/StatCard';

const BLOCKED_IPS_EXPLAIN: MetricExplain = {
  source: 'backend',
  body: [
    'חסימה אוטומטית מופעלת כשכתובת IP אחת גורמת לנעילה של 3 חשבונות שונים ומעלה תוך 24 שעות - זו השכבה השלישית מתוך שלוש הגנות עצמאיות נגד ניחוש סיסמאות (הגבלת קצב + נעילת חשבון + חסימת IP).',
    'חסימה ידנית (הטופס למעלה) עוקפת את הספירה האוטומטית - מאפשרת לחסום מיידית כתובת חשודה גם לפני שהיא הגיעה לסף האוטומטי.',
  ],
  qa: [
    { q: 'מה מבדיל חסימה אוטומטית מידנית?', a: 'אוטומטית מופעלת רק אחרי שה-IP כבר גרם לנעילת 3 חשבונות שונים תוך 24 שעות. ידנית - אפשר לחסום כל כתובת מיידית, גם בלי שהיא הגיעה לסף הזה.' },
    { q: 'חסימה נשארת לתמיד?', a: 'לא - לכל חסימה (אוטומטית וגם ידנית) יש זמן תפוגה (שעות), בברירת מחדל 24 - אפשר גם לבטל ידנית לפני הזמן.' },
    { q: 'זה אותו מנגנון שדיברנו עליו בעמוד אבטחה ואמון?', a: 'כן - זו בדיוק השכבה השלישית מתוך שלוש ההגנות שראינו שם (הגבלת קצב, נעילת חשבון, חסימת IP).' },
  ],
};

const LOGIN_ATTEMPTS_EXPLAIN: MetricExplain = {
  source: 'backend',
  body: [
    'כל ניסיון התחברות (גם כושל) נרשם אוטומטית בטבלה ייעודית בשרת - כולל ניסיונות עם אימייל לא קיים, לא רק הצלחות.',
    'זה בדיוק היומן ה"חלקי" שהוזכר בעמוד אבטחה ואמון - מתעד רק ניסיונות התחברות, לא כל פעולת DB אחרת.',
  ],
  qa: [
    { q: 'זה מתעד גם ניסיונות כושלים, לא רק הצלחות?', a: 'כן - כל תוצאה אפשרית (הצלחה, סיסמה שגויה, אימייל לא קיים, נעילה, חסימת IP) נרשמת, לא רק התחברויות מוצלחות.' },
    { q: 'כמה אחורה זה מראה?', a: 'זו רשימת הניסיונות האחרונים - לא ארכיון מלא בלתי-מוגבל, רק החלון הרלוונטי לבדיקה שוטפת.' },
    { q: 'זה אותו יומן שצוין כ"חלקי" בעמוד אבטחה ואמון?', a: 'בדיוק - זה כל מה שקיים כרגע מבחינת יומן ביקורת: ניסיונות התחברות בלבד, לא כל פעולה מול ה-DB.' },
  ],
};

const FAILED_LOGIN_SUMMARY_EXPLAIN: MetricExplain = {
  source: 'code',
  body: [
    'כל הנתונים כאן מחושבים בדפדפן מתוך אותה רשימת "ניסיונות התחברות אחרונים" שכבר נטענה - לא שאילתה נוספת לשרת.',
    'ה"חשוד" מחושב לפי כלל פשוט: כתובת IP אחת שניסתה (בהצלחה או בכישלון) מול 2 כתובות אימייל שונות או יותר, בתוך אותו חלון הנתונים הנטען - לא ניתוח AI, רק ספירה.',
  ],
  qa: [
    { q: 'זה כולל את כל ההיסטוריה, או רק מה שמוצג?', a: 'רק את החלון שכבר נטען בטבלה למטה - אותה מגבלה שהוסברה על "ניסיונות התחברות אחרונים" עצמם.' },
    { q: 'איך "חשוד" מזוהה בדיוק?', a: 'לא בינה מלאכותית - חוק פשוט: כתובת IP אחת שהופיעה מול יותר מאימייל אחד. זה דפוס קלאסי של ניחוש-סיסמאות נגד כמה חשבונות מאותו מקור.' },
    { q: 'זה אותו דבר כמו חסימת ה-IP האוטומטית?', a: 'לא זהה - החסימה האוטומטית דורשת 3 נעילות-חשבון בפועל. הסימון כאן רחב יותר בכוונה (כבר 2 כתובות שונות, גם בלי נעילה) כדי להראות דפוסים מוקדם יותר.' },
  ],
};

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

function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' });
}

const FAILED_OUTCOMES: ReadonlySet<LoginAttemptOutcome> = new Set(['InvalidCredentials', 'UnknownEmail', 'AccountLocked', 'IpBlocked']);

interface FailedLoginSummary {
  failedCount: number;
  mostFailedUser: { email: string; count: number } | null;
  busiestDay: { day: string; count: number } | null;
  suspiciousIps: ReadonlySet<string>;
}

// הכל מחושב בדפדפן מתוך הרשימה שכבר נטענה - בלי שאילתה נוספת לשרת, בדיוק
// כמו שאר הכרטיסים בדשבורד. "חשוד" הוא כלל ספירה פשוט (לא AI) - ראו
// FAILED_LOGIN_SUMMARY_EXPLAIN למה דווקא 2 אימיילים שונים ולא סף אחר
function summarizeFailedLogins(attempts: LoginAttemptSummary[]): FailedLoginSummary {
  const failed = attempts.filter((a) => FAILED_OUTCOMES.has(a.outcome));

  const perUser = new Map<string, number>();
  const perDay = new Map<string, number>();
  const emailsPerIp = new Map<string, Set<string>>();

  for (const a of failed) {
    const email = a.email || 'לא ידוע';
    perUser.set(email, (perUser.get(email) ?? 0) + 1);

    const day = formatDay(a.attemptedAt);
    perDay.set(day, (perDay.get(day) ?? 0) + 1);

    if (!emailsPerIp.has(a.ipAddress)) emailsPerIp.set(a.ipAddress, new Set());
    emailsPerIp.get(a.ipAddress)!.add(email);
  }

  const mostFailedUser = [...perUser.entries()].sort((a, b) => b[1] - a[1])[0];
  const busiestDay = [...perDay.entries()].sort((a, b) => b[1] - a[1])[0];
  const suspiciousIps = new Set([...emailsPerIp.entries()].filter(([, emails]) => emails.size >= 2).map(([ip]) => ip));

  return {
    failedCount: failed.length,
    mostFailedUser: mostFailedUser ? { email: mostFailedUser[0], count: mostFailedUser[1] } : null,
    busiestDay: busiestDay ? { day: busiestDay[0], count: busiestDay[1] } : null,
    suspiciousIps,
  };
}

type AttemptsFilter = 'failed' | 'mostUser' | 'busiestDay' | 'suspiciousIp' | null;

const inputStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: radius.md,
  border: `1px solid ${colors.border}`,
  backgroundColor: colors.surface,
  color: colors.textPrimary,
  fontSize: '13px',
};

export const LoginSecurityPage: React.FC = () => {
  const { attempts, blockedIps, loading, error, busyIp, unblock, block } = useLoginSecurity();

  const [manualIp, setManualIp] = useState('');
  const [manualHours, setManualHours] = useState('24');
  const [infoOpen, setInfoOpen] = useState<'blocked' | 'attempts' | null>(null);
  const [attemptsFilter, setAttemptsFilter] = useState<AttemptsFilter>(null);

  const failedLoginSummary = useMemo(() => summarizeFailedLogins(attempts ?? []), [attempts]);

  // לחיצה על כרטיס מדד מסננת את הטבלה למטה רק לשורות הרלוונטיות לאותו
  // כרטיס; לחיצה חוזרת על אותו כרטיס מבטלת את הסינון
  const toggleFilter = (filter: AttemptsFilter) => setAttemptsFilter((prev) => (prev === filter ? null : filter));

  const displayedAttempts = useMemo(() => {
    const all = attempts ?? [];
    switch (attemptsFilter) {
      case 'failed':
        return all.filter((a) => FAILED_OUTCOMES.has(a.outcome));
      case 'mostUser':
        return failedLoginSummary.mostFailedUser
          ? all.filter((a) => (a.email || 'לא ידוע') === failedLoginSummary.mostFailedUser!.email)
          : [];
      case 'busiestDay':
        return failedLoginSummary.busiestDay
          ? all.filter((a) => formatDay(a.attemptedAt) === failedLoginSummary.busiestDay!.day)
          : [];
      case 'suspiciousIp':
        return all.filter((a) => failedLoginSummary.suspiciousIps.has(a.ipAddress));
      default:
        return all;
    }
  }, [attempts, attemptsFilter, failedLoginSummary]);

  const handleUnblock = (ip: string) => unblock(ip);

  const handleManualBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    const ip = manualIp.trim();
    const hours = Number(manualHours) || 24;
    if (!ip) return;

    try {
      await block(ip, hours);
      setManualIp('');
    } catch {
      // onError בתוך ה-hook כבר הציג alert - כאן רק מונעים את ניקוי
      // השדה כשהחסימה נכשלה, לא מציגים הודעה כפולה
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
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm }}>
          <h3 style={{ fontSize: '14px', color: colors.textPrimary, margin: 0 }}>כתובות IP חסומות</h3>
          <InfoButton onClick={() => setInfoOpen('blocked')} />
        </div>

        <form onSubmit={handleManualBlock} style={{ display: 'flex', gap: spacing.sm, alignItems: 'center', marginBottom: spacing.md, flexWrap: 'wrap' }}>
          <input
            type="text"
            aria-label="כתובת IP לחסימה ידנית"
            placeholder="כתובת IP לחסימה ידנית"
            value={manualIp}
            onChange={(e) => setManualIp(e.target.value)}
            style={{ ...inputStyle, minWidth: '180px' }}
          />
          <input
            type="number"
            aria-label="מספר שעות לחסימה"
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
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm, flexWrap: 'wrap' }}>
          <h3 style={{ fontSize: '14px', color: colors.textPrimary, margin: 0 }}>ניסיונות התחברות אחרונים</h3>
          <InfoButton onClick={() => setInfoOpen('attempts')} />
          {attemptsFilter && (
            <button
              type="button"
              onClick={() => setAttemptsFilter(null)}
              style={{
                marginRight: 'auto',
                padding: '4px 12px',
                borderRadius: radius.md,
                border: `1px solid ${colors.accent}`,
                backgroundColor: 'transparent',
                color: colors.accentSoft,
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              מציג רק את הכרטיס שנבחר - נקה סינון ✕
            </button>
          )}
        </div>

        {attempts.length > 0 && (
          <div style={{ display: 'flex', gap: spacing.md, flexWrap: 'wrap', marginBottom: spacing.md }}>
            <StatCard
              label="ניסיונות כושלים"
              value={failedLoginSummary.failedCount}
              valueColor={failedLoginSummary.failedCount > 0 ? colors.dangerSoft : colors.successSoft}
              explain={FAILED_LOGIN_SUMMARY_EXPLAIN}
              onClick={() => toggleFilter('failed')}
              active={attemptsFilter === 'failed'}
            />
            <StatCard
              label="המשתמש עם הכי הרבה כשלונות"
              value={failedLoginSummary.mostFailedUser ? `${failedLoginSummary.mostFailedUser.email} (${failedLoginSummary.mostFailedUser.count})` : 'אין'}
              valueColor={colors.warningSoft}
              explain={FAILED_LOGIN_SUMMARY_EXPLAIN}
              onClick={failedLoginSummary.mostFailedUser ? () => toggleFilter('mostUser') : undefined}
              active={attemptsFilter === 'mostUser'}
            />
            <StatCard
              label="היום עם הכי הרבה כשלונות"
              value={failedLoginSummary.busiestDay ? `${failedLoginSummary.busiestDay.day} (${failedLoginSummary.busiestDay.count})` : 'אין'}
              valueColor={colors.accentSoft}
              explain={FAILED_LOGIN_SUMMARY_EXPLAIN}
              onClick={failedLoginSummary.busiestDay ? () => toggleFilter('busiestDay') : undefined}
              active={attemptsFilter === 'busiestDay'}
            />
            <StatCard
              label="כתובות IP חשודות (נגד 2+ חשבונות)"
              value={failedLoginSummary.suspiciousIps.size}
              valueColor={failedLoginSummary.suspiciousIps.size > 0 ? colors.dangerSoft : colors.successSoft}
              explain={FAILED_LOGIN_SUMMARY_EXPLAIN}
              onClick={failedLoginSummary.suspiciousIps.size > 0 ? () => toggleFilter('suspiciousIp') : undefined}
              active={attemptsFilter === 'suspiciousIp'}
            />
          </div>
        )}

        {attempts.length === 0 ? (
          <p style={{ color: colors.textFaint, fontSize: '13px' }}>אין ניסיונות התחברות מתועדים עדיין</p>
        ) : displayedAttempts.length === 0 ? (
          <p style={{ color: colors.textFaint, fontSize: '13px' }}>אין שורות התואמות לסינון שנבחר</p>
        ) : (
          <div style={{ overflowX: 'auto', background: colors.surface, borderRadius: radius.lg, border: `1px solid ${colors.borderSubtle}` }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', color: colors.textSecondary, fontSize: '12.5px' }}>
              <thead>
                <tr style={{ background: colors.card, borderBottom: `1px solid ${colors.border}` }}>
                  <th style={{ padding: '10px 12px' }}></th>
                  <th style={{ padding: '10px 12px' }}>אימייל</th>
                  <th style={{ padding: '10px 12px' }}>כתובת IP</th>
                  <th style={{ padding: '10px 12px' }}>לקוח</th>
                  <th style={{ padding: '10px 12px' }}>תוצאה</th>
                  <th style={{ padding: '10px 12px' }}>זמן</th>
                </tr>
              </thead>
              <tbody>
                {displayedAttempts.map((a, idx) => {
                  const outcome = OUTCOME_LABELS[a.outcome];
                  const isSuspicious = failedLoginSummary.suspiciousIps.has(a.ipAddress);
                  return (
                    <tr
                      key={a.id}
                      style={{
                        borderBottom: `1px solid ${colors.borderSubtle}`,
                        backgroundColor: isSuspicious ? colors.dangerBg : idx % 2 === 1 ? colors.surfaceRaised : 'transparent',
                      }}
                    >
                      <td style={{ padding: '10px 12px', textAlign: 'center' }} title={isSuspicious ? 'כתובת זו ניסתה מול יותר מחשבון אחד' : undefined}>
                        {isSuspicious && '🚨'}
                      </td>
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

      {infoOpen === 'blocked' && (
        <MetricInfoModal
          title="כתובות IP חסומות"
          source={BLOCKED_IPS_EXPLAIN.source}
          body={BLOCKED_IPS_EXPLAIN.body}
          qa={BLOCKED_IPS_EXPLAIN.qa}
          onClose={() => setInfoOpen(null)}
        />
      )}
      {infoOpen === 'attempts' && (
        <MetricInfoModal
          title="ניסיונות התחברות אחרונים"
          source={LOGIN_ATTEMPTS_EXPLAIN.source}
          body={LOGIN_ATTEMPTS_EXPLAIN.body}
          qa={LOGIN_ATTEMPTS_EXPLAIN.qa}
          onClose={() => setInfoOpen(null)}
        />
      )}
    </section>
  );
};

export default LoginSecurityPage;
