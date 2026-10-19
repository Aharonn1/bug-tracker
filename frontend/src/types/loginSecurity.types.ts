export type LoginAttemptOutcome = 'Success' | 'InvalidCredentials' | 'UnknownEmail' | 'AccountLocked' | 'IpBlocked';

export interface LoginAttemptSummary {
  id: number;
  email: string;
  ipAddress: string;
  tenantId: string | null;
  outcome: LoginAttemptOutcome;
  attemptedAt: string;
}

export interface BlockedIpSummary {
  id: number;
  ipAddress: string;
  blockedUntil: string;
  reason: string;
  createdAt: string;
}
