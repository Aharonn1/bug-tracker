// הערכים תואמים בכוונה ל-enum UserRole בבקאנד (byte, מתחיל מ-1)
export const UserRole = {
  User: 1,
  Admin: 2,
  SiteAdmin: 3,
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

// תואם ל-ICurrentUserProvider.IsAdminOrAbove בבקאנד - SiteAdmin שומר על כל
// ההרשאות שיש ל-Admin (ולא רק על אלה החוצות-לקוחות), כדי שהעלאת תפקיד
// לא "תוריד" בטעות גישה שכבר הייתה קיימת
export const isAdminOrAbove = (role: UserRole): boolean =>
  role === UserRole.Admin || role === UserRole.SiteAdmin;

export interface AuthUser {
  id: number;
  fullName: string;
  email: string;
  role: UserRole;
}

export interface AuthResponse {
  token: string;
  expiresAt: string;
  user: AuthUser;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  fullName: string;
  email: string;
  password: string;
}

// GET /api/Users - חוצה-לקוחות, זמין רק ל-SiteAdmin (ה-API מחזיר 403 לכל מי שאינו)
export interface UserSummary {
  id: number;
  fullName: string;
  email: string;
  role: UserRole;
  tenantId: string;
}
