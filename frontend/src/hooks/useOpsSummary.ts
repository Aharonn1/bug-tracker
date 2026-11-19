import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { telemetryService } from '../api/telemetryService';

const AUTO_REFRESH_MS = 45_000;
// אותו עיקרון בדיוק כמו ב-useVersionCheck/ConnectionDiagnosticBanner - זה
// יושב ממש על עמוד התקריות (הנטען ראשון, לא lazy), אז בלי דיליי הוא היה
// מתחרה ברשת עם הבקשה שבאמת חשובה: טעינת רשימת התקריות עצמה
const INITIAL_DELAY_MS = 5000;

export const useOpsSummary = (minutes: number = 60) => {
  const [initialDelayElapsed, setInitialDelayElapsed] = useState(false);

  useEffect(() => {
    const timeoutId = setTimeout(() => setInitialDelayElapsed(true), INITIAL_DELAY_MS);
    return () => clearTimeout(timeoutId);
  }, []);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['opsSummary', minutes],
    queryFn: () => telemetryService.getOpsSummary(minutes),
    enabled: initialDelayElapsed,
    refetchInterval: initialDelayElapsed ? AUTO_REFRESH_MS : false,
  });

  return {
    summary: data ?? null,
    loading: isLoading,
    error: error ? 'כשל בטעינת נתוני ניטור' : null,
    reload: refetch,
  };
};
