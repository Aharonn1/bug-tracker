import { useState, useEffect, useCallback } from 'react';
import { type BugReport, type CreateBugDto, BugStatus } from '../types/bug.types';
import { bugService } from '../api/bugService';
import { reportHandledApiFailure } from '../utils/errorReporting';

const PAGE_SIZE = 50;

export function useBugs() {
  const [bugs, setBugs] = useState<BugReport[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBugs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await bugService.getAll(undefined, page, PAGE_SIZE);
      setBugs(data.items);
      setTotalCount(data.totalCount);
    } catch (err: any) {
      setError(err.message || 'שגיאה בשליפת הבאגים');
      reportHandledApiFailure(err);
    } finally {
      setLoading(false);
    }
  }, [page]);

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
      reportHandledApiFailure(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const removeBug = async (id: number) => {
    try {
      await bugService.delete(id);
      setBugs((prev) => prev.filter((bug) => bug.id !== id));
      setTotalCount((prev) => Math.max(0, prev - 1));
    } catch (err: any) {
      setError(err.message || 'שגיאה במחיקת הבאג');
      reportHandledApiFailure(err);
    }
  };

  const updateBugStatus = async (id: number, status: BugStatus) => {
    try {
      const updated = await bugService.updateStatus(id, status);
      setBugs((prev) => prev.map((bug) => (bug.id === id ? updated : bug)));
    } catch (err: any) {
      setError(err.message || 'שגיאה בעדכון הסטטוס');
      reportHandledApiFailure(err);
    }
  };

  return { bugs, totalCount, page, setPage, pageSize: PAGE_SIZE, loading, error, refreshBugs: fetchBugs, addBug, removeBug, updateBugStatus };
}
