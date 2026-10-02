import { useState, useEffect, useCallback } from 'react';
import { telemetryService } from '../api/telemetryService';
import type { SqlHealthMetricsDto } from '../types/telemetry.types';
import { reportHandledApiFailure } from '../utils/errorReporting';

export const useSqlHealthMetrics = (hours: number = 24) => {
  const [metrics, setMetrics] = useState<SqlHealthMetricsDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setMetrics(await telemetryService.getSqlHealthMetrics(hours));
    } catch (err: any) {
      setError(err.message || 'כשל בטעינת מדדי Azure SQL');
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
