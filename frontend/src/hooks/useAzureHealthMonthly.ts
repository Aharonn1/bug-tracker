import { useQuery } from '@tanstack/react-query';
import { telemetryService } from '../api/telemetryService';

// year/month בתוך ה-queryKey (לא רק תלות ב-useEffect) - זה בדיוק מה ש-React
// Query משתמש בו כדי לדעת מתי יש מטמון קיים לחודש הזה (למשל אחרי שחוזרים
// אליו שוב) לעומת מתי צריך fetch חדש
export const useAzureHealthMonthly = (year: number, month: number) => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['azureHealthMonthly', year, month],
    queryFn: () => telemetryService.getAzureHealthMonthly(year, month),
  });

  return {
    data: data ?? null,
    loading: isLoading,
    error: error ? 'כשל בטעינת מגמת בריאות Azure חודשית' : null,
    reload: refetch,
  };
};
