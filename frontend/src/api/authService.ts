import type { AuthResponse, LoginRequest, RegisterRequest } from '../types/auth.types';
import { API_BASE_URL, tenantHeaders } from '../config';
import { ApiConnectivityError } from './ApiConnectivityError';

const BASE_URL = `${API_BASE_URL}/api/Auth`;

async function postAuth(path: string, body: unknown): Promise<Response> {
  try {
    return await fetch(`${BASE_URL}/${path}`, {
      method: 'POST',
      headers: tenantHeaders({
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      }),
      body: JSON.stringify(body),
    });
  } catch {
    // ה-fetch עצמו נכשל - אין חיבור לרשת, או שהשרת/הענן לא נגיש בכלל
    // (לא תגובת שגיאה מהשרת, אלא אי-יכולת להגיע אליו מלכתחילה)
    throw new ApiConnectivityError('לא ניתן להתחבר לשרת - בדוק את חיבור האינטרנט שלך ונסה שוב');
  }
}

export const authService = {
  async login(dto: LoginRequest): Promise<AuthResponse> {
    const res = await postAuth('login', dto);

    if (res.status >= 500) {
      throw new ApiConnectivityError('השרת אינו זמין כרגע (תקלת תשתית/ענן) - נסה שוב בעוד מספר דקות');
    }

    if (!res.ok) {
      const errorData = await res.json().catch(() => null);
      throw new Error(errorData?.message || 'אימייל או סיסמה שגויים');
    }

    return res.json();
  },

  async register(dto: RegisterRequest): Promise<AuthResponse> {
    const res = await postAuth('register', dto);

    if (res.status >= 500) {
      throw new ApiConnectivityError('השרת אינו זמין כרגע (תקלת תשתית/ענן) - נסה שוב בעוד מספר דקות');
    }

    if (!res.ok) {
      const errorData = await res.json().catch(() => null);
      throw new Error(errorData?.message || 'כשל בהרשמה למערכת');
    }

    return res.json();
  },
};
