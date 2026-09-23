import React from 'react';
import { useBugs } from '../hooks/useBugs';
import { BugStatus, BugPriority } from '../types/bug.types';

export const BugList: React.FC = () => {
  const { bugs, loading, error, refreshBugs, removeBug, updateBugStatus } = useBugs();

  const getPriorityBadge = (priority: number) => {
    switch (priority) {
      case BugPriority.Critical:
        return <span style={{ background: '#7f1d1d', color: '#fca5a5', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>קריטי</span>;
      case BugPriority.High:
        return <span style={{ background: '#78350f', color: '#fde047', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>גבוה</span>;
      case BugPriority.Medium:
        return <span style={{ background: '#1e3a8a', color: '#93c5fd', padding: '3px 8px', borderRadius: '4px', fontSize: '11px' }}>בינוני</span>;
      default:
        return <span style={{ background: '#1e293b', color: '#94a3b8', padding: '3px 8px', borderRadius: '4px', fontSize: '11px' }}>נמוך</span>;
    }
  };

  const getStatusBadge = (status: number) => {
    switch (status) {
      case BugStatus.Resolved:
        return <span style={{ color: '#4ade80', fontWeight: 'bold' }}>✓ נפתר</span>;
      case BugStatus.InProgress:
        return <span style={{ color: '#38bdf8', fontWeight: 'bold' }}>⟳ בטיפול</span>;
      default:
        return <span style={{ color: '#f87171', fontWeight: 'bold' }}>● פתוח</span>;
    }
  };

  if (loading && bugs.length === 0) {
    return <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>טוען רשימת באגים...</div>;
  }

  return (
    <div style={{ background: '#0f172a', borderRadius: '12px', border: '1px solid #1e293b', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #1e293b' }}>
        <span style={{ fontSize: '14px', color: '#94a3b8' }}>סך הכל באגים רשומים: <strong style={{ color: '#f8fafc' }}>{bugs.length}</strong></span>
        <button
          onClick={refreshBugs}
          style={{
            backgroundColor: '#1e293b',
            color: '#94a3b8',
            border: '1px solid #334155',
            borderRadius: '6px',
            padding: '6px 12px',
            fontSize: '12px',
            cursor: 'pointer'
          }}
        >
          רענן רשימה ↻
        </button>
      </div>

      {error && (
        <div style={{ margin: '16px', padding: '12px', backgroundColor: '#450a0a', border: '1px solid #991b1b', borderRadius: '8px', color: '#fca5a5', fontSize: '13px' }}>
          {error}
        </div>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', color: '#cbd5e1', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: '#1e293b', borderBottom: '1px solid #334155' }}>
              <th style={{ padding: '12px' }}>מזהה</th>
              <th style={{ padding: '12px' }}>עדיפות</th>
              <th style={{ padding: '12px' }}>מודול מערכת</th>
              <th style={{ padding: '12px' }}>כותרת</th>
              <th style={{ padding: '12px' }}>תיאור</th>
              <th style={{ padding: '12px' }}>סטטוס</th>
              <th style={{ padding: '12px' }}>תאריך דיווח</th>
              <th style={{ padding: '12px' }}>פעולות</th>
            </tr>
          </thead>
          <tbody>
            {bugs.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                  אין באגים מדווחים במערכת
                </td>
              </tr>
            ) : (
              bugs.map((bug) => (
                <tr key={bug.id} style={{ borderBottom: '1px solid #1e293b', background: bug.status === BugStatus.Resolved ? 'rgba(15, 23, 42, 0.4)' : '#131f37' }}>
                  <td style={{ padding: '12px', fontFamily: 'monospace' }}>#{bug.id}</td>
                  <td style={{ padding: '12px' }}>{getPriorityBadge(bug.priority)}</td>
                  <td style={{ padding: '12px', fontWeight: '600', color: '#38bdf8' }}>{bug.systemModule}</td>
                  <td style={{ padding: '12px', fontWeight: 'bold', color: '#fff' }}>{bug.title}</td>
                  <td style={{ padding: '12px', color: '#94a3b8', maxWidth: '300px' }}>{bug.description}</td>
                  <td style={{ padding: '12px' }}>{getStatusBadge(bug.status)}</td>
                  <td style={{ padding: '12px', whiteSpace: 'nowrap', fontSize: '12px' }}>
                    {new Date(bug.createdAt).toLocaleDateString('he-IL')}
                  </td>
                  <td style={{ padding: '12px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {bug.status !== BugStatus.Resolved && (
                        <button
                          onClick={() => updateBugStatus(bug.id, BugStatus.Resolved)}
                          style={{
                            padding: '4px 8px',
                            background: '#15803d',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '11px'
                          }}
                        >
                          סמן כנפתר
                        </button>
                      )}
                      <button
                        onClick={() => removeBug(bug.id)}
                        style={{
                          padding: '4px 8px',
                          background: '#991b1b',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '11px'
                        }}
                      >
                        מחק
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BugList;