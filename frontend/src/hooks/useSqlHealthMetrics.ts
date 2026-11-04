import { useQuery } from '@tanstack/react-query';
import { telemetryService } from '../api/telemetryService';

export const useSqlHealthMetrics = (hours: number = 24) => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['sqlHealthMetrics', hours],
    queryFn: () => telemetryService.getSqlHealthMetrics(hours),
  });

  return {
    metrics: data ?? null,
    loading: isLoading,
    error: error ? 'כשל בטעינת מדדי Azure SQL' : null,
    reload: refetch,
  };
};
