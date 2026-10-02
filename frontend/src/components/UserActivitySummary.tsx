import React, { useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { UserRole } from '../types/auth.types';
import { Card } from './ui/Card';
import { HorizontalBarChart } from './charts/HorizontalBarChart';

interface Props {
  title: string;
  counts: Record<string, number>;
}

// גלוי רק ל-Admin - מציג פילוח כמה תקלות/באגים כל משתמש חווה, כדי לזהות
// במבט אחד איזה משתמש חווה הכי הרבה בעיות
export const UserActivitySummary: React.FC<Props> = ({ title, counts: countsMap }) => {
  const { user } = useAuth();

  const data = useMemo(
    () =>
      Object.entries(countsMap)
        .sort((a, b) => b[1] - a[1])
        .map(([label, value]) => ({ label, value })),
    [countsMap]
  );

  if (user?.role !== UserRole.Admin || data.length === 0) return null;

  return (
    <Card title={title}>
      <HorizontalBarChart data={data} />
    </Card>
  );
};

export default UserActivitySummary;
