import { useState, useEffect, useCallback } from 'react';
import type { SystemIncident } from '../types/bug.types';
import { incidentService } from '../api/incidentService';
import { reportHandledApiFailure } from '../utils/errorReporting';

const PAGE_SIZE = 50;

export const useIncidents = () => {
  const [incidents, setIncidents] = useState<SystemIncident[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [filterSubsystem, setFilterSubsystemState] = useState<string>('');
  const [unresolvedOnly, setUnresolvedOnlyState] = useState<boolean>(false);

  // שינוי פילטר תמיד חוזר לעמוד 1 - אחרת אפשר "להישאר" בעמוד 5 של פילטר
  // קודם שבפילטר החדש כבר לא קיים בכלל
  const setFilterSubsystem = (value: string) => {
    setFilterSubsystemState(value);
    setPage(1);
  };

  const setUnresolvedOnly = (value: boolean) => {
    setUnresolvedOnlyState(value);
    setPage(1);
  };

  const loadIncidents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await incidentService.getAll(unresolvedOnly, filterSubsystem || undefined, page, PAGE_SIZE);
      setIncidents(Array.isArray(data?.items) ? data.items : []);
      setTotalCount(data?.totalCount ?? 0);
    } catch (err: any) {
      console.error('Error fetching incidents:', err);
      setError(err.message || 'כשל בתקשורת מול שרת ה-API');
      reportHandledApiFailure(err);
    } finally {
      setLoading(false);
    }
  }, [unresolvedOnly, filterSubsystem, page]);

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
    totalCount,
    page,
    setPage,
    pageSize: PAGE_SIZE,
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
