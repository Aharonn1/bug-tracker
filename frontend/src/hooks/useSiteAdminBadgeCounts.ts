import { useCallback, useEffect, useState } from 'react';
import { incidentService } from '../api/incidentService';
import { failedIncidentService } from '../api/failedIncidentService';

const POLL_INTERVAL_MS = 2 * 60 * 1000; // 2 דקות

// תגי המספר ליד "סקירת משרדים" ו"תקריות שנכשלו" בניווט - רלוונטיים רק ל-
// SiteAdmin (אותם טאבים גלויים רק לו), אז enabled חוסם את הקריאות לגמרי
// עבור כל משתמש אחר. אותה תבנית polling כמו useNewIncidentsCount
export function useSiteAdminBadgeCounts(enabled: boolean) {
  const [officesOpenCount, setOfficesOpenCount] = useState(0);
  const [failedIncidentsCount, setFailedIncidentsCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    try {
      const [offices, failed] = await Promise.all([
        incidentService.getOfficesOpenCount(),
        failedIncidentService.getUnresolvedCount(),
      ]);
      setOfficesOpenCount(offices.newCount);
      setFailedIncidentsCount(failed.count);
    } catch {
      // best-effort - משאירים את הערכים הקודמים
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
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
  }, [enabled, refresh]);

  return { officesOpenCount, failedIncidentsCount };
}
