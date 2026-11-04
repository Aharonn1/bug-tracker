import { useQuery } from '@tanstack/react-query';
import { incidentService } from '../api/incidentService';
import { failedIncidentService } from '../api/failedIncidentService';
import { loginSecurityService } from '../api/loginSecurityService';

const POLL_INTERVAL_MS = 2 * 60 * 1000; // 2 דקות

// תגי המספר ליד "סקירת משרדים", "תקריות שנכשלו" ו"אבטחת כניסה" בניווט -
// רלוונטיים רק ל-SiteAdmin (אותם טאבים גלויים רק לו), אז enabled חוסם את
// הקריאות לגמרי עבור כל משתמש אחר. שלוש שאילתות נפרדות (לא Promise.all
// ידני) כדי שכל אחת תנהל מטמון/retry משלה - כשל באחת לא "מרעיל" את השתיים
// האחרות, בניגוד ל-Promise.all המקורי שבו כשל אחד איפס את כל שלוש התוצאות
export function useSiteAdminBadgeCounts(enabled: boolean) {
  const offices = useQuery({
    queryKey: ['officesOpenCount'],
    queryFn: () => incidentService.getOfficesOpenCount(),
    enabled,
    refetchInterval: enabled ? POLL_INTERVAL_MS : false,
  });

  const failed = useQuery({
    queryKey: ['failedIncidentsUnresolvedCount'],
    queryFn: () => failedIncidentService.getUnresolvedCount(),
    enabled,
    refetchInterval: enabled ? POLL_INTERVAL_MS : false,
  });

  const blockedIps = useQuery({
    queryKey: ['blockedIps'],
    queryFn: () => loginSecurityService.getBlockedIps(),
    enabled,
    refetchInterval: enabled ? POLL_INTERVAL_MS : false,
  });

  return {
    officesOpenCount: offices.data?.newCount ?? 0,
    failedIncidentsCount: failed.data?.count ?? 0,
    blockedIpsCount: blockedIps.data?.length ?? 0,
  };
}
