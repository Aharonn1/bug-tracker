import React, { useEffect, useState } from 'react';
import { userService } from '../api/userService';
import { incidentService } from '../api/incidentService';
import type { UserSummary } from '../types/auth.types';
import { UserRole } from '../types/auth.types';
import type { SystemIncident } from '../types/bug.types';
import { colors, radius, severityPalette, shadow, spacing } from '../styles/theme';
import { Card } from '../components/ui/Card';
import { SectionHeader } from '../components/ui/SectionHeader';

// שמות תצוגה בעברית לכל Tenant - קוסמטי בלבד, אין להם שום ייצוג ב-DB
// (ה-TenantId עצמו הוא ה-slug הטכני, למשל "cohen-gold-law")
const TENANT_DISPLAY_NAMES: Record<string, string> = {
  'default-tenant': 'המשרד הראשי',
  'cohen-gold-law': "כהן-גולד ושות', עורכי דין",
  'mizrahi-partners': 'מזרחי ושותפים, משרד עורכי דין',
  'ben-ami-legal': 'בן-עמי משפטי',
};

const SEVERITY_LABELS: Record<number, { label: string; key: keyof typeof severityPalette }> = {
  1: { label: 'נמוכה', key: 'low' },
  2: { label: 'בינונית', key: 'medium' },
  3: { label: 'גבוהה', key: 'high' },
  4: { label: 'קריטית', key: 'critical' },
};

interface OfficeGroup {
  tenantId: string;
  displayName: string;
  manager: UserSummary | null;
  employees: UserSummary[];
  incidents: SystemIncident[];
}

function buildOfficeGroups(users: UserSummary[], incidents: SystemIncident[]): OfficeGroup[] {
  const tenantIds = Array.from(new Set(users.map((u) => u.tenantId))).sort();

  return tenantIds.map((tenantId) => {
    const tenantUsers = users.filter((u) => u.tenantId === tenantId);
    return {
      tenantId,
      displayName: TENANT_DISPLAY_NAMES[tenantId] ?? tenantId,
      manager: tenantUsers.find((u) => u.role === UserRole.Admin) ?? null,
      employees: tenantUsers.filter((u) => u.role === UserRole.User),
      incidents: incidents.filter((i) => i.tenantId === tenantId),
    };
  });
}

export const OfficesOverviewPage: React.FC = () => {
  const [users, setUsers] = useState<UserSummary[] | null>(null);
  const [incidents, setIncidents] = useState<SystemIncident[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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

  const offices = buildOfficeGroups(users, incidents);

  return (
    <section>
      <SectionHeader
        title="סקירת משרדים"
        subtitle={`${offices.length} משרדים, ${users.length} משתמשים, ${incidents.length} תקריות - תצוגה חוצת-לקוחות`}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
        {offices.map((office) => (
          <Card
            key={office.tenantId}
            title={office.displayName}
            style={{ boxShadow: shadow.card }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing.lg, fontSize: '12.5px' }}>
                <div>
                  <span style={{ color: colors.textFaint }}>מנהל/ת משרד: </span>
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

              <div style={{ borderTop: `1px solid ${colors.borderSubtle}`, paddingTop: spacing.md }}>
                <div style={{ fontSize: '11.5px', color: colors.textFaint, marginBottom: spacing.sm }}>
                  תקריות ({office.incidents.length})
                </div>

                {office.incidents.length === 0 ? (
                  <p style={{ color: colors.textFaint, fontSize: '12.5px', margin: 0 }}>אין תקריות עבור משרד זה</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
                    {office.incidents.map((incident) => {
                      const severity = SEVERITY_LABELS[incident.severity] ?? SEVERITY_LABELS[2];
                      const palette = severityPalette[severity.key];
                      return (
                        <div
                          key={incident.incidentId}
                          style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: spacing.sm,
                            padding: `${spacing.sm} ${spacing.md}`,
                            backgroundColor: colors.surface,
                            border: `1px solid ${colors.borderSubtle}`,
                            borderRadius: radius.md,
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, minWidth: '220px' }}>
                            <span
                              style={{
                                fontSize: '10.5px',
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: '999px',
                                backgroundColor: palette.bg,
                                color: palette.text,
                              }}
                            >
                              {severity.label}
                            </span>
                            <span style={{ fontSize: '12.5px', color: colors.textPrimary, fontWeight: 600 }}>
                              {incident.errorCode}
                            </span>
                            {incident.isResolved && (
                              <span style={{ fontSize: '10.5px', color: colors.successSoft }}>נפתרה</span>
                            )}
                          </div>
                          <div style={{ fontSize: '12px', color: colors.textMuted, flex: 1, minWidth: '200px' }}>
                            {incident.hebrewDescription}
                          </div>
                          <div style={{ fontSize: '11.5px', color: colors.textFaint }}>
                            דווח ע"י: {incident.reportedByUsers.map((r) => r.userName).join(', ') || 'לא ידוע'}
                            {incident.occurrencesCount > 1 && ` (${incident.occurrencesCount} הישנויות)`}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
};

export default OfficesOverviewPage;
