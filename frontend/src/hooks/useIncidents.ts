import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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

  // placeholderData: keepPreviousData - במעבר עמוד/פילטר, הטבלה ממשיכה
  // להציג את הנתונים הישנים עד שהחדשים מגיעים, במקום להבזיק למסך טעינה
  // ריק כל פעם. isLoading נשאר true רק בטעינה האמיתית הראשונה; isFetching
  // מבדיל "יש כבר נתונים, מביאים עדכון ברקע" - משמש לנטרל את הדפדוף
  // בזמן הבאת העמוד הבא, בלי לנקות את הטבלה הקיימת
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey,
    queryFn: () => incidentService.getAll(unresolvedOnly, filterSubsystem || undefined, page, PAGE_SIZE),
    placeholderData: keepPreviousData,
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
    fetching: isFetching,
    error: error ? 'כשל בתקשורת מול שרת ה-API' : null,
    filterSubsystem,
    setFilterSubsystem,
    unresolvedOnly,
    setUnresolvedOnly,
    reload: refetch,
    resolveIncident: (id: number, resolutionNotes?: string) => resolveMutation.mutate({ id, resolutionNotes }),
  };
};
