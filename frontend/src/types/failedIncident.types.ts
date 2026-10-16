export interface FailedIncidentSummary {
  id: number;
  tenantId: string;
  errorCode: string;
  errorMessage: string;
  firstFailedAt: string;
  lastAttemptAt: string;
  attemptCount: number;
}

export interface FailedIncidentRetryResult {
  succeeded: boolean;
  errorMessage: string | null;
}
