import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { checkForNewVersion } from '../utils/versionCheck';

const CHECK_INTERVAL_MS = 10 * 60 * 1000; // 10 דקות
const INITIAL_DELAY_MS = 5000;

// בודק אם יש גרסה חדשה פרוסה בשרת שהטאב הנוכחי לא טוען. ה-enabled המקומי
// כאן הוא לא "נתוני שרת" - הוא רק שער של פעם אחת שדוחה את הבדיקה הראשונה
// ב-5 שניות כדי לא להתחרות ברשת עם טעינת הדף עצמה; שאר ההתנהגות (פולינג
// כל 10 דקות, רענון כשחוזרים לטאב) מגיעה מ-React Query כרגיל
export function useVersionCheck(): boolean {
  const [initialDelayElapsed, setInitialDelayElapsed] = useState(false);

  useEffect(() => {
    const timeoutId = setTimeout(() => setInitialDelayElapsed(true), INITIAL_DELAY_MS);
    return () => clearTimeout(timeoutId);
  }, []);

  const { data } = useQuery({
    queryKey: ['versionCheck'],
    queryFn: () => checkForNewVersion(),
    enabled: initialDelayElapsed,
    refetchInterval: initialDelayElapsed ? CHECK_INTERVAL_MS : false,
  });

  return data ?? false;
}
