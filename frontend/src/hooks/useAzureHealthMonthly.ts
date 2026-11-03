import { useState, useEffect, useCallback } from 'react';
import { telemetryService } from '../api/telemetryService';
import type { AzureHealthMonthlyDto } from '../types/telemetry.types';
import { reportHandledApiFailure } from '../utils/errorReporting';

// year/month כפרמטרים (לא פנימיים ל-hook) - כך שינוי חודש בעמוד הוא
// רק state מתחלף, לא remount; ה-reload רץ מחדש אוטומטית דרך ה-dependency
export const useAzureHealthMonthly = (year: number, month: number) => {
  const [data, setData] = useState<AzureHealthMonthlyDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setData(await telemetryService.getAzureHealthMonthly(year, month));
    } catch (err: any) {
      setError(err.message || 'כשל בטעינת מגמת בריאות Azure חודשית');
      reportHandledApiFailure(err);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, loading, error, reload };
};
