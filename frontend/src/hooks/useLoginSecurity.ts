import { useMutation, useQueries, useQueryClient } from '@tanstack/react-query';
import { loginSecurityService } from '../api/loginSecurityService';
import type { BlockedIpSummary } from '../types/loginSecurity.types';

const ATTEMPTS_KEY = ['loginAttempts'] as const;
const BLOCKED_IPS_KEY = ['blockedIps'] as const;

export function useLoginSecurity() {
  const queryClient = useQueryClient();

  // שתי שאילתות בלתי-תלויות שנטענות יחד (לא Promise.all ידני) - כל אחת
  // עם מטמון/retry משלה, אותו שיקול כמו ב-useSiteAdminBadgeCounts
  const [attemptsQuery, blockedIpsQuery] = useQueries({
    queries: [
      { queryKey: ATTEMPTS_KEY, queryFn: () => loginSecurityService.getAttempts() },
      { queryKey: BLOCKED_IPS_KEY, queryFn: () => loginSecurityService.getBlockedIps() },
    ],
  });

  // onError מציג alert מקומי (לא דורס את ה-error הראשי של העמוד - כשל
  // בפעולה בודדת לא אמור להחליף את כל הטבלה במסך שגיאה). reportHandledApiFailure
  // כבר רץ גלובלית על כל כשל (ראו main.tsx), אין צורך לקרוא לו גם כאן
  const unblockMutation = useMutation({
    mutationFn: (ip: string) => loginSecurityService.unblock(ip),
    onSuccess: (_, ip) => {
      queryClient.setQueryData(BLOCKED_IPS_KEY, (old?: BlockedIpSummary[]) =>
        old?.filter((b) => b.ipAddress !== ip)
      );
    },
    onError: (err: Error) => alert(`שגיאה בביטול חסימה: ${err.message}`),
  });

  const blockMutation = useMutation({
    mutationFn: ({ ip, hours }: { ip: string; hours: number }) => loginSecurityService.block(ip, hours),
    onSuccess: () => {
      // לא ידוע לנו ה-id/blockedUntil המדויקים בלי לקרוא לשרת - invalidate
      // רגיל במקום עדכון מטמון ידני, בניגוד ל-unblock (שם התוצאה פשוטה - הסרה)
      queryClient.invalidateQueries({ queryKey: BLOCKED_IPS_KEY });
    },
    onError: (err: Error) => alert(`שגיאה בחסימה ידנית: ${err.message}`),
  });

  const loading = attemptsQuery.isLoading || blockedIpsQuery.isLoading;
  const error = attemptsQuery.error?.message ?? blockedIpsQuery.error?.message ?? null;
  const busyIp = unblockMutation.isPending
    ? unblockMutation.variables
    : blockMutation.isPending
      ? blockMutation.variables.ip
      : null;

  return {
    attempts: attemptsQuery.data ?? null,
    blockedIps: blockedIpsQuery.data ?? null,
    loading,
    error,
    busyIp,
    unblock: (ip: string) => unblockMutation.mutate(ip),
    // mutateAsync (לא mutate) - בניגוד ל-unblock, הדף צריך לדעת מתי זה
    // הסתיים בהצלחה כדי לנקות את שדה ה-IP הידני. onError כבר הציג alert,
    // אז הדף רק תופס ומתעלם (לא מציג הודעה כפולה)
    block: (ip: string, hours: number) => blockMutation.mutateAsync({ ip, hours }),
  };
}
