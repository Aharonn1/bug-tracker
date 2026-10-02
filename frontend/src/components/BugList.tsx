import React, { useMemo, useState } from 'react';
import { useBugs } from '../hooks/useBugs';
import { BugStatus, BugPriority } from '../types/bug.types';
import { UserActivitySummary } from './UserActivitySummary';

export const BugList: React.FC = () => {
  const { bugs, loading, error, refreshBugs, removeBug, updateBugStatus } = useBugs();
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  const userCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const bug of bugs) {
      const name = bug.reportedByUserName || 'לא מזוהה';
      counts[name] = (counts[name] || 0) + 1;
    }
    return counts;
  }, [bugs]);

  const visibleBugs = useMemo(() => {
    if (!selectedUser) return bugs;
    return bugs.filter((bug) => (bug.reportedByUserName || 'לא מזוהה') === selectedUser);
  }, [bugs, selectedUser]);

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
      case BugStatus.Closed:
        return <span style={{ color: '#4ade80', fontWeight: 'bold' }}>✓ נפתר</span>;
      case BugStatus.New:
        return <span style={{ color: '#f87171', fontWeight: 'bold' }}>● פתוח</span>;
      default:
        return <span style={{ color: '#38bdf8', fontWeight: 'bold' }}>⟳ בטיפול</span>;
    }
  };

  if (loading && bugs.length === 0) {
    return <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>טוען רשימת באגים...</div>;
  }

  return (
    <>
      <UserActivitySummary
        title="פילוח באגים לפי משתמש"
        counts={userCounts}
        selectedUser={selectedUser}
        onSelectUser={setSelectedUser}
      />

      {selectedUser && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 14px',
            marginBottom: '14px',
            backgroundColor: '#131f37',
            border: '1px solid #38bdf8',
            borderRadius: '8px',
            fontSize: '13px',
            color: '#cbd5e1',
          }}
        >
          <span>
            מציג באגים של <strong style={{ color: '#f8fafc' }}>{selectedUser}</strong> בלבד ({visibleBugs.length})
          </span>
          <button
            onClick={() => setSelectedUser(null)}
            style={{
              marginRight: 'auto',
              padding: '4px 10px',
              background: 'transparent',
              border: '1px solid #334155',
              borderRadius: '999px',
              color: '#94a3b8',
              fontSize: '11px',
              cursor: 'pointer',
            }}
          >
            נקה סינון ×
          </button>
        </div>
      )}

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
              <th style={{ padding: '12px' }}>דווח על ידי</th>
              <th style={{ padding: '12px' }}>פעולות</th>
            </tr>
          </thead>
          <tbody>
            {visibleBugs.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                  {selectedUser ? 'אין באגים של משתמש זה' : 'אין באגים מדווחים במערכת'}
                </td>
              </tr>
            ) : (
              visibleBugs.map((bug) => (
                <tr key={bug.id} style={{ borderBottom: '1px solid #1e293b', background: bug.status === BugStatus.Closed ? 'rgba(15, 23, 42, 0.4)' : '#131f37' }}>
                  <td style={{ padding: '12px', fontFamily: 'monospace' }}>#{bug.id}</td>
                  <td style={{ padding: '12px' }}>{getPriorityBadge(bug.priority)}</td>
                  <td style={{ padding: '12px', fontWeight: '600', color: '#38bdf8' }}>{bug.systemModule}</td>
                  <td style={{ padding: '12px', fontWeight: 'bold', color: '#fff' }}>{bug.title}</td>
                  <td style={{ padding: '12px', color: '#94a3b8', maxWidth: '300px' }}>{bug.description}</td>
                  <td style={{ padding: '12px' }}>{getStatusBadge(bug.status)}</td>
                  <td style={{ padding: '12px', whiteSpace: 'nowrap', fontSize: '12px' }}>
                    {new Date(bug.createdAt).toLocaleDateString('he-IL')}
                  </td>
                  <td style={{ padding: '12px', fontSize: '12px', color: bug.reportedByUserName ? '#e2e8f0' : '#64748b' }}>
                    {bug.reportedByUserName || 'לא מזוהה'}
                  </td>
                  <td style={{ padding: '12px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {bug.status !== BugStatus.Closed && (
                        <button
                          onClick={() => updateBugStatus(bug.id, BugStatus.Closed)}
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
    </>
  );
};

export default BugList;