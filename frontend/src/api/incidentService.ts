import type { CreateIncidentDto, DbOutageEntry, PagedResult, SystemIncident } from "../types/bug.types";
import { API_BASE_URL, tenantHeaders } from '../config';
import { throwIfSessionExpired } from './sessionGuard';

const BASE_URL = `${API_BASE_URL}/api/Incidents`;

export const incidentService = {
  async getAll(unresolvedOnly?: boolean, subsystem?: string, page = 1, pageSize = 50): Promise<PagedResult<SystemIncident>> {
    const params = new URLSearchParams();
    if (unresolvedOnly) params.append('unresolvedOnly', 'true');
    if (subsystem) params.append('subsystem', subsystem);
    params.append('page', String(page));
    params.append('pageSize', String(pageSize));

    const res = await fetch(`${BASE_URL}?${params.toString()}`, {
      headers: tenantHeaders({ 'Accept': 'application/json' })
    });

    if (!res.ok) { throwIfSessionExpired(res); throw new Error(`שגיאה בטעינת אירועי מערכת (${res.status})`); }
    return res.json();
  },

  // לא נוגע ב-DB בכלל בצד השרת - עובד גם כשבסיס הנתונים לגמרי לא זמין,
  // כל עוד יש טוקן תקף (אימות JWT לא דורש DB)
  async getDbOutageLog(): Promise<DbOutageEntry[]> {
    const res = await fetch(`${BASE_URL}/db-outage-log`, {
      headers: tenantHeaders({ 'Accept': 'application/json' })
    });

    if (!res.ok) { throwIfSessionExpired(res); throw new Error(`שגיאה בטעינת יומן זמינות בסיס הנתונים (${res.status})`); }
    return res.json();
  },

  async getById(id: number): Promise<SystemIncident> {
    const res = await fetch(`${BASE_URL}/${id}`, {
      headers: tenantHeaders({ 'Accept': 'application/json' })
    });

    if (!res.ok) { throwIfSessionExpired(res); throw new Error(`אירוע #${id} לא נמצא (${res.status})`); }
    return res.json();
  },

  async create(dto: CreateIncidentDto): Promise<{ message: string }> {
    const res = await fetch(`${BASE_URL}/ingest`, {
      method: 'POST',
      headers: tenantHeaders({
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }),
      body: JSON.stringify(dto),
    });

    if (!res.ok) {
      throwIfSessionExpired(res);
      const errorData = await res.json().catch(() => null);
      throw new Error(errorData?.message || `כשל בדיווח תקלת מערכת (${res.status})`);
    }

    return res.json();
  },

  async resolve(id: number): Promise<void> {
    const res = await fetch(`${BASE_URL}/${id}/resolve`, {
      method: 'PATCH',
      headers: tenantHeaders({ 'Accept': 'application/json' })
    });

    if (!res.ok) {
      throwIfSessionExpired(res);
      const errorData = await res.json().catch(() => null);
      throw new Error(errorData?.message || `כשל בסימון פתרון תקלה #${id} (${res.status})`);
    }
  },

  async diagnoseWithAgent(id: number): Promise<{
    incidentId: number;
    errorCode: string;
    caseNumber: string | null;
    agentReport: string;
    analyzedAt: string;
  }> {
    const res = await fetch(`${BASE_URL}/${id}/diagnose-agent`, {
      method: 'POST',
      headers: tenantHeaders({ 'Accept': 'application/json' })
    });

    if (!res.ok) {
      throwIfSessionExpired(res);
      const errorData = await res.json().catch(() => null);
      throw new Error(errorData?.detail || errorData?.message || `כשל בהפעלת סוכן AI עבור אירוע #${id} (${res.status})`);
    }

    return res.json();
  },
};
