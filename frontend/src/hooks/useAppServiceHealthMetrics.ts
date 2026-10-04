import { useState, useEffect, useCallback } from 'react';
import { telemetryService } from '../api/telemetryService';
import type { AppServiceHealthMetricsDto } from '../types/telemetry.types';
import { reportHandledApiFailure } from '../utils/errorReporting';

export const useAppServiceHealthMetrics = (hours: number = 24) => {
  const [metrics, setMetrics] = useState<AppServiceHealthMetricsDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setMetrics(await telemetryService.getAppServiceHealthMetrics(hours));
    } catch (err: any) {
      setError(err.message || 'כשל בטעינת מדדי App Service');
      reportHandledApiFailure(err);
    } finally {
      setLoading(false);
    }
  }, [hours]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { metrics, loading, error, reload };
};
