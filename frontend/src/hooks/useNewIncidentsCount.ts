import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { incidentService } from '../api/incidentService';

const POLL_INTERVAL_MS = 2 * 60 * 1000; // 2 דקות
const QUERY_KEY = ['newIncidentsCount'];
// אותו עיקרון בדיוק כמו ב-useVersionCheck/ConnectionDiagnosticBanner - תג
// ניווט לא קריטי כמו רשימת התקריות עצמה, אז לא צריך להתחרות איתה על הרשת
// באותה שנייה שהדף נטען
const INITIAL_DELAY_MS = 5000;

// תג "חדשות מאז הביקור האחרון" בניווט. resetToZero היא לא refetch - היא
// דריסה מקומית מיידית של המטמון (queryClient.setQueryData) אחרי שהצד
// שקורא ל-hook כבר סימן בשרת "נצפה" (ראו App.tsx) - אין טעם לחכות
// לפולינג הבא כדי שהתג ייעלם, וגם לא צריך קריאת רשת נוספת בשביל זה
export function useNewIncidentsCount() {
  const queryClient = useQueryClient();
  const [initialDelayElapsed, setInitialDelayElapsed] = useState(false);

  useEffect(() => {
    const timeoutId = setTimeout(() => setInitialDelayElapsed(true), INITIAL_DELAY_MS);
    return () => clearTimeout(timeoutId);
  }, []);

  const { data } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => incidentService.getNewCount(),
    enabled: initialDelayElapsed,
    refetchInterval: initialDelayElapsed ? POLL_INTERVAL_MS : false,
    refetchIntervalInBackground: false,
  });

  return {
    newCount: data?.newCount ?? 0,
    resetToZero: () => queryClient.setQueryData(QUERY_KEY, { newCount: 0 }),
  };
}
