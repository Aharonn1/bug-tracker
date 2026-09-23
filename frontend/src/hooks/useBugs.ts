import { useState, useEffect, useCallback } from 'react';
import { type BugReport, type CreateBugDto, BugStatus } from '../types/bug.types';
import { bugService } from '../api/bugService';

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
    }
  };

  const updateBugStatus = async (id: number, status: BugStatus) => {
    try {
      const updated = await bugService.updateStatus(id, status);
      setBugs((prev) => prev.map((bug) => (bug.id === id ? updated : bug)));
    } catch (err: any) {
      setError(err.message || 'שגיאה בעדכון הסטטוס');
    }
  };

  return { bugs, loading, error, refreshBugs: fetchBugs, addBug, removeBug, updateBugStatus };
}