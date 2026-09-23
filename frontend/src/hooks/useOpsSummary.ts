import { useState, useEffect, useCallback } from 'react';
import { telemetryService } from '../api/telemetryService';
import type { OpsSummaryDto } from '../types/telemetry.types';

const AUTO_REFRESH_MS = 45_000;

export const useOpsSummary = (minutes: number = 60) => {
  const [summary, setSummary] = useState<OpsSummaryDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setSummary(await telemetryService.getOpsSummary(minutes));
    } catch (err: any) {
      setError(err.message || 'כשל בטעינת נתוני ניטור');
    } finally {
      setLoading(false);
    }
  }, [minutes]);

  useEffect(() => {
    reload();
    const intervalId = setInterval(reload, AUTO_REFRESH_MS);
    return () => clearInterval(intervalId);
  }, [reload]);

  return { summary, loading, error, reload };
};
