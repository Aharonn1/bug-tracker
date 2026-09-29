import React, { useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { UserRole } from '../types/auth.types';

interface Props {
  title: string;
  items: Array<{ reportedByUserName: string | null }>;
}

// גלוי רק ל-Admin - מציג פילוח כמה תקלות/באגים כל משתמש דיווח, כדי לזהות
// במבט אחד איזה משתמש חווה הכי הרבה בעיות
export const UserActivitySummary: React.FC<Props> = ({ title, items }) => {
  const { user } = useAuth();

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of items) {
      const name = item.reportedByUserName || 'לא מזוהה';
      map.set(name, (map.get(name) || 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [items]);

  if (user?.role !== UserRole.Admin || counts.length === 0) return null;

  const maxCount = counts[0][1];

  return (
    <div style={{
      background: '#1e293b',
      border: '1px solid #334155',
      borderRadius: '12px',
      padding: '16px 20px',
      marginBottom: '20px',
    }}>
      <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '12px', fontWeight: 600 }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {counts.map(([name, count]) => (
          <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ minWidth: '110px', fontSize: '13px', color: '#e2e8f0' }}>{name}</span>
            <div style={{ flex: 1, background: '#0f172a', borderRadius: '999px', height: '8px', overflow: 'hidden' }}>
              <div style={{
                width: `${(count / maxCount) * 100}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #2563eb, #7c3aed)',
                borderRadius: '999px',
              }} />
            </div>
            <span style={{ minWidth: '20px', fontSize: '13px', fontWeight: 700, color: '#f8fafc', textAlign: 'left' }}>{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UserActivitySummary;
