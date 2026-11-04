import { useQuery, useQueryClient } from '@tanstack/react-query';
import { incidentService } from '../api/incidentService';

const POLL_INTERVAL_MS = 2 * 60 * 1000; // 2 דקות
const QUERY_KEY = ['newIncidentsCount'];

// תג "חדשות מאז הביקור האחרון" בניווט. resetToZero היא לא refetch - היא
// דריסה מקומית מיידית של המטמון (queryClient.setQueryData) אחרי שהצד
// שקורא ל-hook כבר סימן בשרת "נצפה" (ראו App.tsx) - אין טעם לחכות
// לפולינג הבא כדי שהתג ייעלם, וגם לא צריך קריאת רשת נוספת בשביל זה
export function useNewIncidentsCount() {
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => incidentService.getNewCount(),
    refetchInterval: POLL_INTERVAL_MS,
    refetchIntervalInBackground: false,
  });

  return {
    newCount: data?.newCount ?? 0,
    resetToZero: () => queryClient.setQueryData(QUERY_KEY, { newCount: 0 }),
  };
}
