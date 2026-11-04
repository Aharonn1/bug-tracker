import { useQuery } from '@tanstack/react-query';
import { telemetryService } from '../api/telemetryService';

const AUTO_REFRESH_MS = 45_000;

export const useOpsSummary = (minutes: number = 60) => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['opsSummary', minutes],
    queryFn: () => telemetryService.getOpsSummary(minutes),
    refetchInterval: AUTO_REFRESH_MS,
  });

  return {
    summary: data ?? null,
    loading: isLoading,
    error: error ? 'כשל בטעינת נתוני ניטור' : null,
    reload: refetch,
  };
};
