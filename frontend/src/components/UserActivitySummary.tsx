import React, { useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { UserRole } from '../types/auth.types';
import { colors } from '../styles/theme';
import { Card } from './ui/Card';
import { HorizontalBarChart } from './charts/HorizontalBarChart';

interface Props {
  title: string;
  counts: Record<string, number>;
  selectedUser: string | null;
  onSelectUser: (user: string | null) => void;
}

// גלוי רק ל-Admin - מציג פילוח כמה תקלות/באגים כל משתמש חווה, כדי לזהות
// במבט אחד איזה משתמש חווה הכי הרבה בעיות. לחיצה על משתמש מסננת את
// הטבלה למטה להציג רק את התקלות שלו (ה-state עצמו מנוהל ב-IncidentsPage)
export const UserActivitySummary: React.FC<Props> = ({ title, counts: countsMap, selectedUser, onSelectUser }) => {
  const { user } = useAuth();

  const data = useMemo(
    () =>
      Object.entries(countsMap)
        .sort((a, b) => b[1] - a[1])
        .map(([label, value]) => ({ label, value })),
    [countsMap]
  );

  if (user?.role !== UserRole.Admin || data.length === 0) return null;

  const handleBarClick = (label: string) => {
    onSelectUser(selectedUser === label ? null : label);
  };

  return (
    <Card
      title={title}
      action={
        selectedUser && (
          <button
            onClick={() => onSelectUser(null)}
            style={{
              padding: '4px 10px',
              background: 'transparent',
              border: `1px solid ${colors.border}`,
              borderRadius: '999px',
              color: colors.textMuted,
              fontSize: '11px',
              cursor: 'pointer',
            }}
          >
            נקה סינון ×
          </button>
        )
      }
    >
      <p style={{ margin: '0 0 10px 0', fontSize: '12px', color: colors.textFaint }}>
        לחיצה על משתמש מסננת את טבלת התקלות למטה להציג רק את שלו
      </p>
      <HorizontalBarChart data={data} selectedLabel={selectedUser} onBarClick={handleBarClick} />
    </Card>
  );
};

export default UserActivitySummary;
