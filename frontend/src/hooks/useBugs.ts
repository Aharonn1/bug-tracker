import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type CreateBugDto, BugStatus } from '../types/bug.types';
import { bugService } from '../api/bugService';

const PAGE_SIZE = 50;

// BugForm ו-BugList קוראים ל-hook הזה בנפרד (שני instance-ים), אבל חולקים
// את אותו queryKey ['bugs', page] - כשBugForm יוצר באג חדש, ה-invalidate
// מעדכן את הרשימה גם ב-BugList בלי שום קריאה ישירה ביניהם. ב-useState
// המקורי זה לא היה קורה בכלל: ל-BugForm היה עותק נפרד ולא-מוצג של הרשימה
export function useBugs() {
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ['bugs', page],
    queryFn: () => bugService.getAll(undefined, page, PAGE_SIZE),
    placeholderData: keepPreviousData,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['bugs'] });

  const addMutation = useMutation({
    mutationFn: (dto: CreateBugDto) => bugService.create(dto),
    onSuccess: invalidate,
  });

  // עדכון ישיר של המטמון (לא invalidate+refetch) - שומר על אותה תחושת
  // מיידיות שהייתה ב-setBugs הידני המקורי, בלי סיבוב רשת נוסף בשביל
  // תוצאה שכבר ידועה לנו במדויק (הפריט הוסר/הסטטוס שלו התעדכן)
  const removeMutation = useMutation({
    mutationFn: (id: number) => bugService.delete(id),
    onSuccess: (_, id) => {
      queryClient.setQueryData(['bugs', page], (old: typeof data) =>
        old ? { ...old, items: old.items.filter((bug) => bug.id !== id), totalCount: Math.max(0, old.totalCount - 1) } : old
      );
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: BugStatus }) => bugService.updateStatus(id, status),
    onSuccess: (updated) => {
      queryClient.setQueryData(['bugs', page], (old: typeof data) =>
        old ? { ...old, items: old.items.map((bug) => (bug.id === updated.id ? updated : bug)) } : old
      );
    },
  });

  return {
    bugs: data?.items ?? [],
    totalCount: data?.totalCount ?? 0,
    page,
    setPage,
    pageSize: PAGE_SIZE,
    loading: isLoading,
    fetching: isFetching,
    error: error ? 'שגיאה בשליפת הבאגים' : null,
    refreshBugs: invalidate,
    addBug: (dto: CreateBugDto) => addMutation.mutateAsync(dto),
    removeBug: (id: number) => removeMutation.mutateAsync(id),
    updateBugStatus: (id: number, status: BugStatus) => updateStatusMutation.mutateAsync({ id, status }),
  };
}
