import { useState, useEffect, useCallback } from 'react';
import { telemetryService } from '../api/telemetryService';
import type { AzureServiceHealthDto } from '../types/telemetry.types';
import { reportHandledApiFailure } from '../utils/errorReporting';

export const useAzureServiceHealth = () => {
  const [health, setHealth] = useState<AzureServiceHealthDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setHealth(await telemetryService.getAzureServiceHealth());
    } catch (err: any) {
      setError(err.message || 'כשל בטעינת סטטוס Azure Service Health');
      reportHandledApiFailure(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { health, loading, error, reload };
};
