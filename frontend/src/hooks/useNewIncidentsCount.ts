import { useCallback, useEffect, useState } from 'react';
import { incidentService } from '../api/incidentService';

const POLL_INTERVAL_MS = 2 * 60 * 1000; // 2 דקות

// תג "חדשות מאז הביקור האחרון" בניווט - בודק בעלייה, בכל חזרה לטאב, ואז
// תקופתית. כשל נבלע בשקט (best-effort, לא מפיל את הדשבורד) - אותו עיקרון
// כמו useVersionCheck
export function useNewIncidentsCount() {
  const [newCount, setNewCount] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const result = await incidentService.getNewCount();
      setNewCount(result.newCount);
    } catch {
      // best-effort - משאירים את הערך הקודם
    }
  }, []);

  useEffect(() => {
    refresh();
    const intervalId = setInterval(refresh, POLL_INTERVAL_MS);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [refresh]);

  return { newCount, resetToZero: () => setNewCount(0) };
}
