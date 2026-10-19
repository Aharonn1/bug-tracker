import type { BlockedIpSummary, LoginAttemptSummary } from '../types/loginSecurity.types';
import { API_BASE_URL, tenantHeaders } from '../config';
import { throwIfSessionExpired } from './sessionGuard';

const BASE_URL = `${API_BASE_URL}/api/LoginSecurity`;

export const loginSecurityService = {
  async getAttempts(): Promise<LoginAttemptSummary[]> {
    const res = await fetch(`${BASE_URL}/attempts`, {
      headers: tenantHeaders({ 'Accept': 'application/json' })
    });

    if (!res.ok) { throwIfSessionExpired(res); throw new Error(`שגיאה בטעינת ניסיונות התחברות (${res.status})`); }
    return res.json();
  },

  async getBlockedIps(): Promise<BlockedIpSummary[]> {
    const res = await fetch(`${BASE_URL}/blocked-ips`, {
      headers: tenantHeaders({ 'Accept': 'application/json' })
    });

    if (!res.ok) { throwIfSessionExpired(res); throw new Error(`שגיאה בטעינת כתובות IP חסומות (${res.status})`); }
    return res.json();
  },

  async unblock(ip: string): Promise<void> {
    const res = await fetch(`${BASE_URL}/blocked-ips/${encodeURIComponent(ip)}/unblock`, {
      method: 'POST',
      headers: tenantHeaders(),
    });

    if (!res.ok) {
      throwIfSessionExpired(res);
      const errorData = await res.json().catch(() => null);
      throw new Error(errorData?.message || `כשל בביטול חסימה עבור ${ip} (${res.status})`);
    }
  },

  async block(ip: string, durationHours: number): Promise<void> {
    const res = await fetch(`${BASE_URL}/blocked-ips/${encodeURIComponent(ip)}/block`, {
      method: 'POST',
      headers: tenantHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ durationHours }),
    });

    if (!res.ok) {
      throwIfSessionExpired(res);
      const errorData = await res.json().catch(() => null);
      throw new Error(errorData?.message || `כשל בחסימת ${ip} (${res.status})`);
    }
  },
};
