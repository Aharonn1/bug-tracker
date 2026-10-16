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
};
