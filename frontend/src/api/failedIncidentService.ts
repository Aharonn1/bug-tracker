import type { FailedIncidentRetryResult, FailedIncidentSummary } from '../types/failedIncident.types';
import { API_BASE_URL, tenantHeaders } from '../config';
import { throwIfSessionExpired } from './sessionGuard';

const BASE_URL = `${API_BASE_URL}/api/FailedIncidents`;

export const failedIncidentService = {
  async getUnresolved(): Promise<FailedIncidentSummary[]> {
    const res = await fetch(BASE_URL, {
      headers: tenantHeaders({ 'Accept': 'application/json' })
    });

    if (!res.ok) { throwIfSessionExpired(res); throw new Error(`שגיאה בטעינת תור התקריות שנכשלו (${res.status})`); }
    return res.json();
  },

  async getUnresolvedCount(): Promise<{ count: number }> {
    const res = await fetch(`${BASE_URL}/count`, {
      headers: tenantHeaders({ 'Accept': 'application/json' })
    });

    if (!res.ok) { throwIfSessionExpired(res); throw new Error(`שגיאה בטעינת ספירת תקריות שנכשלו (${res.status})`); }
    return res.json();
  },

  async retryNow(id: number): Promise<FailedIncidentRetryResult> {
    const res = await fetch(`${BASE_URL}/${id}/retry`, {
      method: 'POST',
      headers: tenantHeaders({ 'Accept': 'application/json' })
    });

    if (!res.ok) {
      throwIfSessionExpired(res);
      const errorData = await res.json().catch(() => null);
      throw new Error(errorData?.message || `כשל בניסיון חוזר עבור תקרית #${id} (${res.status})`);
    }

    return res.json();
  },
};
