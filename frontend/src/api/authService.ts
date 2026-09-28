import type { AuthResponse, LoginRequest, RegisterRequest } from '../types/auth.types';
import { API_BASE_URL, tenantHeaders } from '../config';

const BASE_URL = `${API_BASE_URL}/api/Auth`;

export const authService = {
  async login(dto: LoginRequest): Promise<AuthResponse> {
    const res = await fetch(`${BASE_URL}/login`, {
      method: 'POST',
      headers: tenantHeaders({
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      }),
      body: JSON.stringify(dto),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => null);
      throw new Error(errorData?.message || 'אימייל או סיסמה שגויים');
    }

    return res.json();
  },

  async register(dto: RegisterRequest): Promise<AuthResponse> {
    const res = await fetch(`${BASE_URL}/register`, {
      method: 'POST',
      headers: tenantHeaders({
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      }),
      body: JSON.stringify(dto),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => null);
      throw new Error(errorData?.message || 'כשל בהרשמה למערכת');
    }

    return res.json();
  },
};
