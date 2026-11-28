import React, { useEffect, useMemo, useState } from 'react';
import { userService } from '../api/userService';
import { incidentService } from '../api/incidentService';
import type { UserSummary } from '../types/auth.types';
import { UserRole } from '../types/auth.types';
import type { SystemIncident } from '../types/bug.types';
import { colors, radius, severityPalette, shadow, spacing } from '../styles/theme';
import { SectionHeader } from '../components/ui/SectionHeader';
import { InfoButton } from '../components/ui/InfoButton';
import { MetricInfoModal } from '../components/ui/MetricInfoModal';
import { TENANT_DISPLAY_NAMES } from '../constants/tenantDisplayNames';

// הסבר "מה קורה מאחורי הקלעים" - זהה לכל כרטיס משרד, כי זה אותו מנגנון
// בדיוק שרץ עבור כולם, רק עם נתונים שונים
const OFFICES_OVERVIEW_EXPLAIN = {
  source: 'frontend' as const,
  body: [
    'אין endpoint ייעודי ל"סקירת משרדים" בשרת - העמוד שולף את כל המשתמשים ואת התקריות (עד 200 הראשונות) דרך שני endpoints כלליים שכבר קיימים, ומקבץ אותם למשרדים ישירות בדפדפן (JavaScript), לפי TenantId.',
    'המשמעות: אם יש יותר מ-200 תקריות בסך הכול במערכת, התצוגה כאן לא בהכרח משקפת את כולן - זו מגבלה אמיתית, לא רק ניסוח-יתר.',
  ],
  qa: [
    { q: 'יש כאן קוד שרת ייעודי שמחשב את הסיכום הזה?', a: 'לא - זה בנוי כולו בדפדפן, מתוך שני endpoints כלליים שכבר קיימים (משתמשים ותקריות), לא endpoint מיוחד ל"משרדים".' },
    { q: 'זה מציג תמונה מלאה של כל התקריות בכל המשרדים?', a: 'לא לגמרי - הנתונים מוגבלים ל-200 התקריות הראשונות שמגיעות מה-API. אם יש יותר מזה בסך הכול, התצוגה הזו לא תשקף הכל.' },
    { q: 'למה בכלל לבנות את זה ככה, בלי endpoint ייעודי?', a: 'כי זה מסך פנימי ל-SiteAdmin בלבד, בשימוש נדיר יחסית - לא הצדיק עדיין להשקיע ב-endpoint מיוחד. אם ההיקף יגדל, זה המקום הראשון שכדאי לשדרג.' },
  ],
};

const SEVERITY_ORDER = [4, 3, 2, 1] as const;
const SEVERITY_LABELS: Record<number, { label: string; short: string; key: keyof typeof severityPalette }> = {
  1: { label: 'נמוכה', short: 'נמ', key: 'low' },
  2: { label: 'בינונית', short: 'בינ', key: 'medium' },
  3: { label: 'גבוהה', short: 'גבו', key: 'high' },
  4: { label: 'קריטית', short: 'קריט', key: 'critical' },
};

interface OfficeGroup {
  tenantId: string;
  displayName: string;
  manager: UserSummary | null;
  employees: UserSummary[];
  incidents: SystemIncident[];
  unresolvedCount: number;
  severityCounts: Record<number, number>;
}

function buildOfficeGroups(users: UserSummary[], incidents: SystemIncident[]): OfficeGroup[] {
  const tenantIds = Array.from(new Set(users.map((u) => u.tenantId))).sort();

  return tenantIds.map((tenantId) => {
    const tenantUsers = users.filter((u) => u.tenantId === tenantId);
    // תקריות שדווחו רק ע"י ה-SiteAdmin (או בלי מדווח מזוהה בכלל) לא נחשבות
    // "פעילות המשרד" - אותו שיקול שכבר חל על התצוגה של מנהל/ת המשרד עצמה
    // (IncidentsController.excludeSiteAdminOnlyIncidents), מוחל כאן גם כש-
    // SiteAdmin עצמו מסתכל על משרד ספציפי מתוך "סקירת משרדים"
    const tenantIncidents = incidents.filter(
      (i) => i.tenantId === tenantId && i.reportedByUsers.some((r) => r.role !== UserRole.SiteAdmin)
    );
    const severityCounts: Record<number, number> = {};
    for (const inc of tenantIncidents) {
      severityCounts[inc.severity] = (severityCounts[inc.severity] ?? 0) + 1;
    }

    return {
      tenantId,
      displayName: TENANT_DISPLAY_NAMES[tenantId] ?? tenantId,
      manager: tenantUsers.find((u) => u.role === UserRole.Admin) ?? null,
      employees: tenantUsers.filter((u) => u.role === UserRole.User),
      incidents: tenantIncidents,
      unresolvedCount: tenantIncidents.filter((i) => !i.isResolved).length,
      severityCounts,
    };
  });
}

function initials(fullName: string): string {
  return fullName.split(' ').map((p) => p[0]).slice(0, 2).join('');
}

const SeverityChips: React.FC<{ counts: Record<number, number> }> = ({ counts }) => {
  const present = SEVERITY_ORDER.filter((s) => counts[s] > 0);
  if (present.length === 0) {
    return <span style={{ fontSize: '11.5px', color: colors.textFaint }}>אין תקריות</span>;
  }
  return (
    <div style={{ display: 'flex', gap: spacing.xs, flexWrap: 'wrap' }}>
      {present.map((s) => {
        const palette = severityPalette[SEVERITY_LABELS[s].key];
        return (
          <span
            key={s}
            title={SEVERITY_LABELS[s].label}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '11px',
              fontWeight: 700,
              padding: '3px 9px',
              borderRadius: '999px',
              backgroundColor: palette.bg,
              color: palette.text,
            }}
          >
            {SEVERITY_LABELS[s].short} {counts[s]}
          </span>
        );
      })}
    </div>
  );
};

const Chevron: React.FC<{ open: boolean }> = ({ open }) => (
  <svg
    width="16" height="16" viewBox="0 0 16 16" fill="none"
    style={{ transition: 'transform 0.15s ease', transform: open ? 'rotate(90deg)' : 'rotate(0deg)', flexShrink: 0 }}
  >
    <path d="M6 4L10 8L6 12" stroke={colors.textFaint} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const OfficeCard: React.FC<{ office: OfficeGroup; open: boolean; onToggle: () => void }> = ({ office, open, onToggle }) => {
  const [hovered, setHovered] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);

  return (
    <div
      style={{
        position: 'relative',
        background: colors.card,
        border: `1px solid ${open ? colors.accent : colors.border}`,
        borderRadius: radius.lg,
        boxShadow: shadow.card,
        overflow: 'hidden',
        transition: 'border-color 0.15s ease',
      }}
    >
      {/* מחוץ ל-<button> של ה-toggle בכוונה - button לא יכול להיות מקונן
          בתוך button אחר (HTML לא חוקי). ממוקם מעליו ויזואלית (z-index),
          כך לחיצה עליו לא מפעילה גם את ה-toggle מתחתיו */}
      <div style={{ position: 'absolute', top: '14px', left: '14px', zIndex: 2 }}>
        <InfoButton onClick={() => setInfoOpen(true)} />
      </div>
      <button
        onClick={onToggle}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: spacing.md,
          padding: `${spacing.md} ${spacing.lg}`,
          backgroundColor: hovered ? colors.cardHover : 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'right',
          transition: 'background-color 0.15s ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md, minWidth: 0 }}>
          <Chevron open={open} />
          <div
            style={{
              width: '34px', height: '34px', borderRadius: '50%', flexShrink: 0,
              backgroundColor: colors.violet, color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '12px', fontWeight: 700,
            }}
          >
            {office.manager ? initials(office.manager.fullName) : '?'}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: colors.textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {office.displayName}
            </div>
            <div style={{ fontSize: '11.5px', color: colors.textFaint, marginTop: '2px' }}>
              מנהל/ת משרד: <span style={{ color: colors.textMuted }}>{office.manager?.fullName ?? 'לא מוגדר'}</span>
              {' · '}{office.employees.length} עובדים
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.lg, flexShrink: 0 }}>
          <SeverityChips counts={office.severityCounts} />
          <div style={{ textAlign: 'center', minWidth: '52px' }}>
            <div style={{ fontSize: '18px', fontWeight: 700, color: office.unresolvedCount > 0 ? colors.dangerSoft : colors.textPrimary, fontVariantNumeric: 'tabular-nums' }}>
              {office.incidents.length}
            </div>
            <div style={{ fontSize: '10px', color: colors.textFaint }}>תקריות</div>
          </div>
        </div>
      </button>

      {open && (
        <div style={{ padding: `0 ${spacing.lg} ${spacing.lg}`, borderTop: `1px solid ${colors.borderSubtle}` }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing.lg, fontSize: '12.5px', padding: `${spacing.md} 0` }}>
            <div>
              <span style={{ color: colors.textFaint }}>מנהל/ת: </span>
              <span style={{ color: colors.textPrimary, fontWeight: 600 }}>
                {office.manager ? `${office.manager.fullName} (${office.manager.email})` : 'לא מוגדר'}
              </span>
            </div>
            <div>
              <span style={{ color: colors.textFaint }}>עובדים: </span>
              <span style={{ color: colors.textSecondary }}>
                {office.employees.map((e) => e.fullName).join(', ') || 'אין'}
              </span>
            </div>
          </div>

          {office.incidents.length === 0 ? (
            <p style={{ color: colors.textFaint, fontSize: '12.5px', margin: 0 }}>אין תקריות עבור משרד זה</p>
          ) : (
            <div style={{ overflowX: 'auto', background: colors.surface, borderRadius: radius.lg, border: `1px solid ${colors.borderSubtle}` }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', color: colors.textSecondary, fontSize: '12.5px' }}>
                <thead>
                  <tr style={{ background: colors.card, borderBottom: `1px solid ${colors.border}` }}>
                    <th style={{ padding: '10px 12px' }}>חומרה</th>
                    <th style={{ padding: '10px 12px' }}>קוד שגיאה</th>
                    <th style={{ padding: '10px 12px' }}>תיאור</th>
                    <th style={{ padding: '10px 12px' }}>מערכת</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center' }}>הופעות</th>
                    <th style={{ padding: '10px 12px' }}>עדכון אחרון</th>
                    <th style={{ padding: '10px 12px' }}>דווח ע"י</th>
                    <th style={{ padding: '10px 12px' }}>סטטוס</th>
                  </tr>
                </thead>
                <tbody>
                  {office.incidents.map((incident, idx) => {
                    const severity = SEVERITY_LABELS[incident.severity] ?? SEVERITY_LABELS[2];
                    const palette = severityPalette[severity.key];
                    const employeeReporters = incident.reportedByUsers.filter((r) => r.role !== UserRole.SiteAdmin);
                    return (
                      <tr
                        key={incident.incidentId}
                        style={{
                          borderBottom: `1px solid ${colors.borderSubtle}`,
                          backgroundColor: idx % 2 === 1 ? colors.surfaceRaised : 'transparent',
                        }}
                      >
                        <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                          <span
                            style={{
                              fontSize: '10.5px',
                              fontWeight: 700,
                              padding: '3px 9px',
                              borderRadius: '999px',
                              backgroundColor: palette.bg,
                              color: palette.text,
                            }}
                          >
                            {severity.label}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', fontWeight: 600, color: colors.textPrimary, whiteSpace: 'nowrap' }}>
                          {incident.errorCode}
                        </td>
                        <td style={{ padding: '10px 12px', color: colors.textMuted, maxWidth: '360px' }}>
                          {incident.hebrewDescription}
                        </td>
                        <td style={{ padding: '10px 12px', color: colors.accentSoft, fontWeight: 600, whiteSpace: 'nowrap' }}>
                          {incident.subsystem}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
                          {incident.occurrencesCount}
                        </td>
                        <td style={{ padding: '10px 12px', whiteSpace: 'nowrap', fontSize: '11.5px', color: colors.textFaint }}>
                          {new Date(incident.lastSeenAt).toLocaleString('he-IL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td style={{ padding: '10px 12px', whiteSpace: 'nowrap', fontSize: '11.5px' }}>
                          {employeeReporters.map((r) => r.userName).join(', ') || 'לא ידוע'}
                        </td>
                        <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                          {incident.isResolved ? (
                            <span style={{ color: colors.successSoft, fontWeight: 700, fontSize: '11.5px' }}>✓ נפתרה</span>
                          ) : (
                            <span style={{ color: colors.dangerSoft, fontWeight: 700, fontSize: '11.5px' }}>● פתוחה</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {infoOpen && (
        <MetricInfoModal
          title={`${office.displayName} - איך הסקירה הזו עובדת`}
          source={OFFICES_OVERVIEW_EXPLAIN.source}
          body={OFFICES_OVERVIEW_EXPLAIN.body}
          qa={OFFICES_OVERVIEW_EXPLAIN.qa}
          onClose={() => setInfoOpen(false)}
        />
      )}
    </div>
  );
};

export const OfficesOverviewPage: React.FC = () => {
  const [users, setUsers] = useState<UserSummary[] | null>(null);
  const [incidents, setIncidents] = useState<SystemIncident[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [openTenantId, setOpenTenantId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [usersResult, incidentsResult] = await Promise.all([
          userService.getAll(),
          incidentService.getAll(undefined, undefined, 1, 200),
        ]);
        if (cancelled) return;
        setUsers(usersResult);
        setIncidents(incidentsResult.items);
      } catch (err: any) {
        if (!cancelled) setError(err.message || 'כשל בטעינת סקירת המשרדים');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  const offices = useMemo(() => (users && incidents ? buildOfficeGroups(users, incidents) : []), [users, incidents]);

  if (loading) {
    return (
      <section>
        <SectionHeader title="סקירת משרדים" subtitle="משרדים, מנהלי משרד, ותקלות לפי לקוח" />
        <p style={{ color: colors.textMuted, fontSize: '13px' }}>טוען...</p>
      </section>
    );
  }

  if (error || !users || !incidents) {
    return (
      <section>
        <SectionHeader title="סקירת משרדים" subtitle="משרדים, מנהלי משרד, ותקלות לפי לקוח" />
        <div style={{ padding: spacing.lg, backgroundColor: colors.dangerBg, border: `1px solid ${colors.dangerBorder}`, borderRadius: radius.md, color: colors.dangerSoft, fontSize: '13px' }}>
          {error ?? 'שגיאה לא צפויה'}
          {error?.includes('403') && ' - עמוד זה זמין רק למנהל-העל (SiteAdmin) חוצה-הלקוחות.'}
        </div>
      </section>
    );
  }

  // סכום התקריות המסוננות לכל משרד (לא incidents.length הגולמי) - כדי שהמספר
  // כאן יתאים בדיוק למה שמוצג בפועל כשפותחים כל משרד, לא יכלול תקריות
  // שדווחו רק ע"י ה-SiteAdmin
  const totalEmployeeIncidents = offices.reduce((sum, o) => sum + o.incidents.length, 0);

  return (
    <section>
      <SectionHeader
        title="סקירת משרדים"
        subtitle={`${offices.length} משרדים, ${users.length} משתמשים, ${totalEmployeeIncidents} תקריות - תצוגה חוצת-לקוחות. לחצו על משרד כדי לראות את התקריות שלו`}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
        {offices.map((office) => (
          <OfficeCard
            key={office.tenantId}
            office={office}
            open={openTenantId === office.tenantId}
            onToggle={() => setOpenTenantId((cur) => (cur === office.tenantId ? null : office.tenantId))}
          />
        ))}
      </div>
    </section>
  );
};

export default OfficesOverviewPage;
