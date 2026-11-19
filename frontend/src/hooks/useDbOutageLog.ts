import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { incidentService } from '../api/incidentService';

const POLL_INTERVAL_MS = 60_000;
// אותו עיקרון בדיוק כמו ב-useVersionCheck/ConnectionDiagnosticBanner - דיליי
// התחלתי כדי שהבדיקה הזו (best-effort, לא קריטית) לא תתחרה ברשת עם טעינת
// רשימת התקריות האמיתית, באותה שנייה שהמשתמש הכי צריך אותה מהר
const INITIAL_DELAY_MS = 5000;

// מתעדכן באופן עצמאי מכל שאר הדשבורד - עובד גם כשטעינת רשימת התקריות/באגים
// הרגילה נכשלת לגמרי (כי ה-DB למטה), כי ה-endpoint שהוא קורא לו לא נוגע ב-DB
//
// הבאנר הזה מוצג בלי תנאי לכל משתמש מחובר (ראה DbOutageBanner), אז ה-poll
// הזה רץ ברקע אצל כל אחד, תמיד - גם כש-99.9% מהזמן אין שום outage להציג.
// refetchIntervalInBackground: false (גם ברירת המחדל של React Query) +
// refetchOnWindowFocus (ברירת המחדל הגלובלית, ראו main.tsx) נותנים בדיוק
// את מה שהיה מומש ידנית: poll רק כשהטאב גלוי, וחוזר מיד כשחוזרים אליו
export function useDbOutageLog() {
  const [initialDelayElapsed, setInitialDelayElapsed] = useState(false);

  useEffect(() => {
    const timeoutId = setTimeout(() => setInitialDelayElapsed(true), INITIAL_DELAY_MS);
    return () => clearTimeout(timeoutId);
  }, []);

  const { data } = useQuery({
    queryKey: ['dbOutageLog'],
    queryFn: () => incidentService.getDbOutageLog(),
    enabled: initialDelayElapsed,
    refetchInterval: initialDelayElapsed ? POLL_INTERVAL_MS : false,
    refetchIntervalInBackground: false,
    // אם גם ה-endpoint הקליל הזה נכשל - אין מה להציג, משאירים את המצב
    // הקודם (לא retry אגרסיבי על באנר שממילא best-effort)
    retry: false,
  });

  return { entries: data ?? [] };
}
