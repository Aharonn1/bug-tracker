import { useState, useEffect, useCallback } from 'react';
import type { DbOutageEntry } from '../types/bug.types';
import { incidentService } from '../api/incidentService';

const POLL_INTERVAL_MS = 60_000;

// מתעדכן באופן עצמאי מכל שאר הדשבורד - עובד גם כשטעינת רשימת התקריות/באגים
// הרגילה נכשלת לגמרי (כי ה-DB למטה), כי ה-endpoint שהוא קורא לו לא נוגע ב-DB
//
// הבאנר הזה מוצג בלי תנאי לכל משתמש מחובר (ראה DbOutageBanner), אז ה-poll
// הזה רץ ברקע אצל כל אחד, תמיד - גם כש-99.9% מהזמן אין שום outage להציג.
// בקנה מידה של אלפי משתמשים זה מצטבר למעמסה אמיתית על ה-API, בשביל באנר
// שכמעט תמיד ריק. שני דברים מצמצמים את זה: המרווח עלה מ-15 שניות (שהיה
// אגרסיבי מדי) ל-60, וה-poll לא רץ בכלל כשהטאב לא גלוי (visibilitychange) -
// רק חוזר מיד כשחוזרים לטאב, כדי לא לפספס outage שקרה בזמן שהוא ברקע
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

    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible') poll();
    }, POLL_INTERVAL_MS);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') poll();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [poll]);

  return { entries };
}
