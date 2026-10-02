import React, { useMemo } from 'react';
import type { SystemIncident } from '../types/bug.types';
import { colors, radius } from '../styles/theme';
import { SectionHeader } from '../components/ui/SectionHeader';
import { OpsSummaryPanel } from '../components/OpsSummaryPanel';
import { UserActivitySummary } from '../components/UserActivitySummary';
import { IncidentMetrics } from '../components/IncidentMetrics';
import { IncidentTable } from '../components/IncidentTable';

interface IncidentsPageProps {
  incidents: SystemIncident[];
  loading: boolean;
  error: string | null;
  filterSubsystem: string;
  setFilterSubsystem: (value: string) => void;
  unresolvedOnly: boolean;
  setUnresolvedOnly: (value: boolean) => void;
  resolveIncident: (id: number) => void;
  reload: () => void;
}

export const IncidentsPage: React.FC<IncidentsPageProps> = ({
  incidents,
  loading,
  error,
  filterSubsystem,
  setFilterSubsystem,
  unresolvedOnly,
  setUnresolvedOnly,
  resolveIncident,
  reload,
}) => {
  const incidentUserCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const incident of incidents) {
      if (incident.reportedByUsers.length === 0) {
        counts['לא מזוהה'] = (counts['לא מזוהה'] || 0) + 1;
        continue;
      }
      for (const reporter of incident.reportedByUsers) {
        counts[reporter.userName] = (counts[reporter.userName] || 0) + reporter.occurrenceCount;
      }
    }
    return counts;
  }, [incidents]);

  const selectStyle: React.CSSProperties = {
    backgroundColor: colors.card,
    color: colors.textSecondary,
    border: `1px solid ${colors.border}`,
    borderRadius: radius.md,
    padding: '8px 14px',
    fontSize: '13px',
    cursor: 'pointer',
  };

  return (
    <section>
      <SectionHeader
        title="מוקד בקרה ואירועי קצה (NOC)"
        subtitle='מעקב חריגות תהיל"ה, נט המשפט ומערכות הוצאה לפועל'
        actions={
          <>
            <select
              value={filterSubsystem}
              onChange={(e) => setFilterSubsystem(e.target.value)}
              style={selectStyle}
            >
              <option value="">כל המערכות הממשלתיות</option>
              <option value="NetHaMishpat">נט המשפט</option>
              <option value="EcaGov">רשות האכיפה והגבייה</option>
              <option value="DocumentEngine">מנוע חתימה ומסמכים</option>
            </select>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: colors.textSecondary, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={unresolvedOnly}
                onChange={(e) => setUnresolvedOnly(e.target.checked)}
                style={{ cursor: 'pointer', accentColor: colors.accent }}
              />
              תקלות פתוחות בלבד
            </label>

            <button
              onClick={reload}
              style={{ ...selectStyle, cursor: 'pointer' }}
            >
              רענן נתונים ↻
            </button>
          </>
        }
      />

      <OpsSummaryPanel />
      <UserActivitySummary title="פילוח תקלות לפי משתמש" counts={incidentUserCounts} />
      <IncidentMetrics incidents={incidents} />

      {error && (
        <div
          style={{
            padding: '14px',
            backgroundColor: colors.dangerBg,
            border: `1px solid ${colors.dangerBorder}`,
            borderRadius: radius.md,
            color: colors.dangerSoft,
            marginBottom: '20px',
            fontSize: '13px',
          }}
        >
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: colors.textFaint }}>טוען נתונים ממסד הנתונים...</div>
      ) : (
        <IncidentTable incidents={incidents} onResolve={resolveIncident} />
      )}
    </section>
  );
};

export default IncidentsPage;
