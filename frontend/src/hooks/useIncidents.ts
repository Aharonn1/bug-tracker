import { useState, useEffect, useCallback } from 'react';
import type { SystemIncident } from '../types/bug.types';
import { incidentService } from '../api/incidentService';
import { reportHandledApiFailure } from '../utils/errorReporting';

export const useIncidents = () => {
  const [incidents, setIncidents] = useState<SystemIncident[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [filterSubsystem, setFilterSubsystem] = useState<string>('');
  const [unresolvedOnly, setUnresolvedOnly] = useState<boolean>(false);

  const loadIncidents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await incidentService.getAll(unresolvedOnly, filterSubsystem || undefined);
      setIncidents(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Error fetching incidents:', err);
      setError(err.message || 'כשל בתקשורת מול שרת ה-API');
      reportHandledApiFailure(err);
    } finally {
      setLoading(false);
    }
  }, [unresolvedOnly, filterSubsystem]);

  const resolveIncident = async (id: number) => {
    try {
      await incidentService.resolve(id);

      setIncidents(prev => prev.map(inc =>
        inc.incidentId === id ? { ...inc, isResolved: true, resolvedAt: new Date().toISOString() } : inc
      ));
    } catch (err: any) {
      alert(`שגיאה: ${err.message}`);
      reportHandledApiFailure(err);
    }
  };

  useEffect(() => {
    loadIncidents();
  }, [loadIncidents]);

  return {
    incidents,
    loading,
    error,
    filterSubsystem,
    setFilterSubsystem,
    unresolvedOnly,
    setUnresolvedOnly,
    reload: loadIncidents,
    resolveIncident,
  };
};
