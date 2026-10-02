import React, { useMemo, useState } from 'react';
import { IncidentSeverity, type SystemIncident } from '../types/bug.types';
import { colors, radius } from '../styles/theme';
import { SectionHeader } from '../components/ui/SectionHeader';
import { OpsSummaryPanel } from '../components/OpsSummaryPanel';
import { AzureSqlHealthCard } from '../components/AzureSqlHealthCard';
import { UserActivitySummary } from '../components/UserActivitySummary';
import { KeyMetricsRow } from '../components/metrics/KeyMetricsRow';
import { SeverityBreakdownCard } from '../components/metrics/SeverityBreakdownCard';
import { IncidentTrendCard, dayKeyOf } from '../components/metrics/IncidentTrendCard';
import { IncidentTable } from '../components/IncidentTable';

const SEVERITY_LABELS: Record<IncidentSeverity, string> = {
  [IncidentSeverity.Critical]: 'קריטי',
  [IncidentSeverity.High]: 'גבוה',
  [IncidentSeverity.Medium]: 'בינוני',
  [IncidentSeverity.Low]: 'נמוך',
};

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
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [selectedSeverity, setSelectedSeverity] = useState<IncidentSeverity | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

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

  const visibleIncidents = useMemo(() => {
    let result = incidents;
    if (selectedUser) {
      result = selectedUser === 'לא מזוהה'
        ? result.filter((i) => i.reportedByUsers.length === 0)
        : result.filter((i) => i.reportedByUsers.some((r) => r.userName === selectedUser));
    }
    if (selectedSeverity !== null) {
      result = result.filter((i) => i.severity === selectedSeverity);
    }
    if (selectedDay) {
      result = result.filter((i) => dayKeyOf(i.createdAt) === selectedDay);
    }
    return result;
  }, [incidents, selectedUser, selectedSeverity, selectedDay]);

  const activeFilters = [
    selectedUser && { key: 'user', label: `משתמש: ${selectedUser}`, clear: () => setSelectedUser(null) },
    selectedSeverity !== null && { key: 'severity', label: `חומרה: ${SEVERITY_LABELS[selectedSeverity]}`, clear: () => setSelectedSeverity(null) },
    selectedDay && { key: 'day', label: `יום: ${new Date(selectedDay).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' })}`, clear: () => setSelectedDay(null) },
  ].filter((f): f is { key: string; label: string; clear: () => void } => !!f);

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

      <div style={{ marginBottom: '20px' }}>
        <AzureSqlHealthCard />
      </div>

      <UserActivitySummary
        title="פילוח תקלות לפי משתמש"
        counts={incidentUserCounts}
        selectedUser={selectedUser}
        onSelectUser={setSelectedUser}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
        <KeyMetricsRow incidents={incidents} />
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) minmax(280px, 1.4fr)', gap: '16px' }}>
          <SeverityBreakdownCard
            incidents={incidents}
            selectedSeverity={selectedSeverity}
            onSelectSeverity={setSelectedSeverity}
          />
          <IncidentTrendCard
            incidents={incidents}
            selectedDay={selectedDay}
            onSelectDay={setSelectedDay}
          />
        </div>
      </div>

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

      {activeFilters.length > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            flexWrap: 'wrap',
            padding: '10px 14px',
            marginBottom: '14px',
            backgroundColor: colors.surfaceRaised,
            border: `1px solid ${colors.accentSoft}`,
            borderRadius: radius.md,
            fontSize: '13px',
            color: colors.textSecondary,
          }}
        >
          <span>מציג {visibleIncidents.length} תקלות לפי:</span>
          {activeFilters.map((f) => (
            <span
              key={f.key}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '3px 6px 3px 10px',
                backgroundColor: colors.card,
                border: `1px solid ${colors.border}`,
                borderRadius: '999px',
                fontSize: '12px',
                color: colors.textPrimary,
              }}
            >
              {f.label}
              <button
                onClick={f.clear}
                style={{
                  width: '16px',
                  height: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'transparent',
                  border: 'none',
                  color: colors.textMuted,
                  cursor: 'pointer',
                  fontSize: '13px',
                  padding: 0,
                }}
              >
                ×
              </button>
            </span>
          ))}
          <button
            onClick={() => { setSelectedUser(null); setSelectedSeverity(null); setSelectedDay(null); }}
            style={{
              marginRight: 'auto',
              padding: '4px 10px',
              background: 'transparent',
              border: `1px solid ${colors.border}`,
              borderRadius: '999px',
              color: colors.textMuted,
              fontSize: '11px',
              cursor: 'pointer',
            }}
          >
            נקה הכל ×
          </button>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: colors.textFaint }}>טוען נתונים ממסד הנתונים...</div>
      ) : (
        <IncidentTable incidents={visibleIncidents} onResolve={resolveIncident} />
      )}
    </section>
  );
};

export default IncidentsPage;
