import React from 'react';
import { useOpsSummary } from '../hooks/useOpsSummary';
import { colors } from '../styles/theme';
import { StatCard } from './ui/StatCard';
import { METRIC_EXPLANATIONS } from '../content/metricExplanations';

export const OpsSummaryPanel: React.FC = () => {
  const { summary, loading, error, reload } = useOpsSummary(60);

  if (error) return null;
  if (!loading && !summary) return null;

  const failureRate = summary && summary.totalRequests > 0 ? (summary.failedRequests / summary.totalRequests) * 100 : 0;

  return (
    <div style={{ marginBottom: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <span style={{ fontSize: '13px', color: colors.textMuted }}>ניטור חי (Azure Monitor) · שעה אחרונה</span>
        <button
          onClick={() => reload()}
          disabled={loading}
          style={{
            backgroundColor: 'transparent',
            border: `1px solid ${colors.border}`,
            color: colors.textMuted,
            borderRadius: '6px',
            padding: '4px 10px',
            fontSize: '12px',
            cursor: loading ? 'default' : 'pointer',
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? 'טוען...' : 'רענן'}
        </button>
      </div>

      {/* סדר מימין לשמאל לפי מה שהכי חשוב לבדוק קודם: האם יש כשלים כרגע
          (הכי דחוף/מדאיג) → ביצועים (זמן תגובה) → נפח-בקשות (הקשר, הכי פחות
          מדאיג כשלעצמו) */}
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        <StatCard
          label="בקשות שנכשלו"
          value={
            <>
              {summary?.failedRequests ?? '—'}
              {summary && summary.totalRequests > 0 && (
                <span style={{ fontSize: '13px', color: colors.textMuted, marginRight: '6px' }}>
                  ({failureRate.toFixed(1)}%)
                </span>
              )}
            </>
          }
          valueColor={(summary?.failedRequests ?? 0) > 0 ? colors.dangerSoft : colors.successSoft}
          explain={METRIC_EXPLANATIONS.opsFailedRequests}
        />
        <StatCard
          label="זמן תגובה חציוני"
          value={
            <>
              {summary ? Math.round(summary.medianResponseTimeMs) : '—'}
              <span style={{ fontSize: '13px', color: colors.textMuted }}>ms</span>
            </>
          }
          valueColor={colors.accentSoft}
          explain={METRIC_EXPLANATIONS.opsMedianResponse}
        />
        <StatCard
          label='סה"כ בקשות'
          value={summary?.totalRequests ?? '—'}
          explain={METRIC_EXPLANATIONS.opsTotalRequests}
        />
      </div>
    </div>
  );
};
