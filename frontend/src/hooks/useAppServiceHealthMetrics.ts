import { useQuery } from '@tanstack/react-query';
import { telemetryService } from '../api/telemetryService';

export const useAppServiceHealthMetrics = (hours: number = 24) => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['appServiceHealthMetrics', hours],
    queryFn: () => telemetryService.getAppServiceHealthMetrics(hours),
  });

  return {
    metrics: data ?? null,
    loading: isLoading,
    error: error ? 'כשל בטעינת מדדי App Service' : null,
    reload: refetch,
  };
};
