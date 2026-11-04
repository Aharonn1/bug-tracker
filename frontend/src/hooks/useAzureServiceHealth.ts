import { useQuery } from '@tanstack/react-query';
import { telemetryService } from '../api/telemetryService';

// הודעת שגיאה/reportHandledApiFailure מטופלות גלובלית (ראו main.tsx) - לא
// צריך עוד try/catch ידני כאן. health=null מציין "לא מוגדר/204", לא שגיאה
export const useAzureServiceHealth = () => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['azureServiceHealth'],
    queryFn: () => telemetryService.getAzureServiceHealth(),
  });

  return {
    health: data ?? null,
    loading: isLoading,
    error: error ? 'כשל בטעינת סטטוס Azure Service Health' : null,
    reload: refetch,
  };
};
