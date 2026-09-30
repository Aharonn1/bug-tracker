import { useState, useEffect, useCallback } from 'react';
import { type BugReport, type CreateBugDto, BugStatus } from '../types/bug.types';
import { bugService } from '../api/bugService';
import { reportSilentError } from '../utils/errorReporting';

export function useBugs() {
  const [bugs, setBugs] = useState<BugReport[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBugs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await bugService.getAll();
      setBugs(data);
    } catch (err: any) {
      setError(err.message || 'שגיאה בשליפת הבאגים');
      reportSilentError('CLIENT_HANDLED_API_FAILURE', err.message, err.stack);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBugs();
  }, [fetchBugs]);

  const addBug = async (dto: CreateBugDto) => {
    setLoading(true);
    try {
      await bugService.create(dto);
      await fetchBugs();
    } catch (err: any) {
      setError(err.message || 'שגיאה ביצירת הבאג');
      reportSilentError('CLIENT_HANDLED_API_FAILURE', err.message, err.stack);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const removeBug = async (id: number) => {
    try {
      await bugService.delete(id);
      setBugs((prev) => prev.filter((bug) => bug.id !== id));
    } catch (err: any) {
      setError(err.message || 'שגיאה במחיקת הבאג');
      reportSilentError('CLIENT_HANDLED_API_FAILURE', err.message, err.stack);
    }
  };

  const updateBugStatus = async (id: number, status: BugStatus) => {
    try {
      const updated = await bugService.updateStatus(id, status);
      setBugs((prev) => prev.map((bug) => (bug.id === id ? updated : bug)));
    } catch (err: any) {
      setError(err.message || 'שגיאה בעדכון הסטטוס');
      reportSilentError('CLIENT_HANDLED_API_FAILURE', err.message, err.stack);
    }
  };

  return { bugs, loading, error, refreshBugs: fetchBugs, addBug, removeBug, updateBugStatus };
}