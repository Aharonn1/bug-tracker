import React from 'react';
import { useOpsSummary } from '../hooks/useOpsSummary';

export const OpsSummaryPanel: React.FC = () => {
  const { summary, loading, error, reload } = useOpsSummary(60);

  const cardStyle: React.CSSProperties = {
    background: '#1e293b',
    padding: '16px 20px',
    borderRadius: '12px',
    border: '1px solid #334155',
    flex: '1',
    minWidth: '200px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  };

  if (error) return null;
  if (!loading && !summary) return null;

  const failureRate = summary && summary.totalRequests > 0 ? (summary.failedRequests / summary.totalRequests) * 100 : 0;

  return (
    <div style={{ marginBottom: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <span style={{ fontSize: '13px', color: '#94a3b8' }}>ניטור חי (Azure Monitor) · שעה אחרונה</span>
        <button
          onClick={reload}
          disabled={loading}
          style={{
            backgroundColor: 'transparent',
            border: '1px solid #334155',
            color: '#94a3b8',
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

      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        <div style={cardStyle}>
          <span style={{ fontSize: '13px', color: '#94a3b8' }}>סה"כ בקשות</span>
          <strong style={{ fontSize: '26px', color: '#f8fafc' }}>{summary?.totalRequests ?? '—'}</strong>
        </div>
        <div style={cardStyle}>
          <span style={{ fontSize: '13px', color: '#94a3b8' }}>בקשות שנכשלו</span>
          <strong style={{ fontSize: '26px', color: (summary?.failedRequests ?? 0) > 0 ? '#f87171' : '#4ade80' }}>
            {summary?.failedRequests ?? '—'}
            {summary && summary.totalRequests > 0 && (
              <span style={{ fontSize: '13px', color: '#94a3b8', marginRight: '6px' }}>
                ({failureRate.toFixed(1)}%)
              </span>
            )}
          </strong>
        </div>
        <div style={cardStyle}>
          <span style={{ fontSize: '13px', color: '#94a3b8' }}>זמן תגובה חציוני</span>
          <strong style={{ fontSize: '26px', color: '#38bdf8' }}>
            {summary ? Math.round(summary.medianResponseTimeMs) : '—'}
            <span style={{ fontSize: '13px', color: '#94a3b8' }}>ms</span>
          </strong>
        </div>
      </div>
    </div>
  );
};
