import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { incidentService } from '../api/incidentService';
import type { PagedResult } from '../types/bug.types';
import type { SystemIncident } from '../types/bug.types';

const PAGE_SIZE = 50;

export const useIncidents = () => {
  const [page, setPage] = useState(1);
  const [filterSubsystem, setFilterSubsystemState] = useState<string>('');
  const [unresolvedOnly, setUnresolvedOnlyState] = useState<boolean>(false);
  const queryClient = useQueryClient();

  // שינוי פילטר תמיד חוזר לעמוד 1 - אחרת אפשר "להישאר" בעמוד 5 של פילטר
  // קודם שבפילטר החדש כבר לא קיים בכלל
  const setFilterSubsystem = (value: string) => {
    setFilterSubsystemState(value);
    setPage(1);
  };

  const setUnresolvedOnly = (value: boolean) => {
    setUnresolvedOnlyState(value);
    setPage(1);
  };

  const queryKey = ['incidents', unresolvedOnly, filterSubsystem, page] as const;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn: () => incidentService.getAll(unresolvedOnly, filterSubsystem || undefined, page, PAGE_SIZE),
  });

  // עדכון ישיר של המטמון אחרי resolve - אותה תחושת מיידיות שהייתה ב-setIncidents
  // הידני, בלי לחכות לסיבוב רשת נוסף על נתון שכבר ידוע לנו. לא throw-ing
  // (mutate, לא mutateAsync) כי זה תואם את ההתנהגות הקודמת - alert מקומי,
  // לא מפיל את הקריאה. reportHandledApiFailure כבר רץ גלובלית (ראו main.tsx)
  const resolveMutation = useMutation({
    mutationFn: ({ id, resolutionNotes }: { id: number; resolutionNotes?: string }) =>
      incidentService.resolve(id, resolutionNotes),
    onSuccess: (_, { id, resolutionNotes }) => {
      queryClient.setQueryData(queryKey, (old?: PagedResult<SystemIncident>) =>
        old
          ? {
              ...old,
              items: old.items.map((inc) =>
                inc.incidentId === id
                  ? { ...inc, isResolved: true, resolvedAt: new Date().toISOString(), resolutionNotes: resolutionNotes || inc.resolutionNotes }
                  : inc
              ),
            }
          : old
      );
    },
    onError: (err: Error) => {
      alert(`שגיאה: ${err.message}`);
    },
  });

  return {
    incidents: data?.items ?? [],
    totalCount: data?.totalCount ?? 0,
    page,
    setPage,
    pageSize: PAGE_SIZE,
    loading: isLoading,
    error: error ? 'כשל בתקשורת מול שרת ה-API' : null,
    filterSubsystem,
    setFilterSubsystem,
    unresolvedOnly,
    setUnresolvedOnly,
    reload: refetch,
    resolveIncident: (id: number, resolutionNotes?: string) => resolveMutation.mutate({ id, resolutionNotes }),
  };
};
