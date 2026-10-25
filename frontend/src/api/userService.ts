import type { UserSummary } from '../types/auth.types';
import { API_BASE_URL, tenantHeaders } from '../config';
import { throwIfSessionExpired } from './sessionGuard';

const BASE_URL = `${API_BASE_URL}/api/Users`;

export const userService = {
  async getAll(): Promise<UserSummary[]> {
    const res = await fetch(BASE_URL, {
      headers: tenantHeaders({ 'Accept': 'application/json' })
    });

    if (!res.ok) { throwIfSessionExpired(res); throw new Error(`שגיאה בטעינת רשימת המשתמשים (${res.status})`); }
    return res.json();
  },

  async markIncidentsViewed(): Promise<void> {
    const res = await fetch(`${BASE_URL}/me/incidents-viewed`, {
      method: 'POST',
      headers: tenantHeaders(),
    });

    if (!res.ok) { throwIfSessionExpired(res); throw new Error(`כשל בסימון תקריות כנצפו (${res.status})`); }
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    const res = await fetch(`${BASE_URL}/me/change-password`, {
      method: 'POST',
      headers: tenantHeaders({ 'Content-Type': 'application/json', 'Accept': 'application/json' }),
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    if (!res.ok) {
      throwIfSessionExpired(res);
      const errorData = await res.json().catch(() => null);
      throw new Error(errorData?.message || errorData?.detail || 'שינוי הסיסמה נכשל');
    }
  },
};
