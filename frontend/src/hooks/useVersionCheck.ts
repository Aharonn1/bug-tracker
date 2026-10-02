import { useEffect, useState } from 'react';
import { checkForNewVersion } from '../utils/versionCheck';

const CHECK_INTERVAL_MS = 10 * 60 * 1000; // 10 דקות

// בודק אם יש גרסה חדשה פרוסה בשרת שהטאב הנוכחי לא טוען - בעלייה הראשונה
// (אחרי השהיה קצרה, כדי לא להתחרות ברשת עם טעינת הדף עצמה), בכל חזרה
// לטאב, ואז כל 10 דקות כל עוד הטאב פתוח
export function useVersionCheck(): boolean {
  const [hasNewVersion, setHasNewVersion] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const result = await checkForNewVersion();
      if (!cancelled) setHasNewVersion(result);
    };

    const initialTimeout = setTimeout(run, 5000);
    const intervalId = setInterval(run, CHECK_INTERVAL_MS);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') run();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      cancelled = true;
      clearTimeout(initialTimeout);
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  return hasNewVersion;
}
