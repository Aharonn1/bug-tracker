import { useState, useEffect, useCallback } from 'react';
import type { DbOutageEntry } from '../types/bug.types';
import { incidentService } from '../api/incidentService';

const POLL_INTERVAL_MS = 15_000;

// מתעדכן באופן עצמאי מכל שאר הדשבורד - עובד גם כשטעינת רשימת התקריות/באגים
// הרגילה נכשלת לגמרי (כי ה-DB למטה), כי ה-endpoint שהוא קורא לו לא נוגע ב-DB
export function useDbOutageLog() {
  const [entries, setEntries] = useState<DbOutageEntry[]>([]);

  const poll = useCallback(async () => {
    try {
      const data = await incidentService.getDbOutageLog();
      setEntries(data);
    } catch {
      // אם גם ה-endpoint הקליל הזה נכשל (למשל אין טוקן תקף, או שהשרת כולו
      // למטה) - אין מה להציג, פשוט משאירים את המצב הקודם
    }
  }, []);

  useEffect(() => {
    poll();
    const intervalId = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [poll]);

  return { entries };
}
