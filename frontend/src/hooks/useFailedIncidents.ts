import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { failedIncidentService } from '../api/failedIncidentService';
import type { FailedIncidentSummary } from '../types/failedIncident.types';

const QUERY_KEY = ['failedIncidents'] as const;

export function useFailedIncidents() {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => failedIncidentService.getUnresolved(),
  });

  const retryMutation = useMutation({
    mutationFn: (id: number) => failedIncidentService.retryNow(id),
    onSuccess: (result, id) => {
      if (result.succeeded) {
        // הצליח - מוסרים מהמטמון המקומי בלי לחכות ל-fetch מלא נוסף
        queryClient.setQueryData(QUERY_KEY, (old?: FailedIncidentSummary[]) =>
          old?.filter((item) => item.id !== id)
        );
      } else {
        // נכשל שוב - מרעננים כדי לקבל את מונה-הניסיונות המעודכן
        queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      }
    },
  });

  return {
    items: data ?? null,
    loading: isLoading,
    error: error ? error.message : null,
    retryingId: retryMutation.isPending ? (retryMutation.variables ?? null) : null,
    retry: (id: number) => retryMutation.mutate(id),
  };
}
