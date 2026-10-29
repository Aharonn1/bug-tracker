export interface ClientTelemetryProbeDto {
  tenantId: string;
  stationId?: string | null;
  latencyMs: number;
  effectiveConnectionType?: string | null;
  downlinkSpeedMbps?: number | null;
  executionLagMs: number;
  frameJankMs?: number | null;
  hardwareConcurrency?: number | null;
  deviceMemoryGb?: number | null;
  pingAttempts: number;
  pingFailures: number;
  userAgent: string;
  currentUrl: string;
}

// תוצאת בדיקת הרשת ה"כללית" מול שרת חיצוני (לא שלנו) - משמש רק להשוואה
// בצד הלקוח, לכן נפרד לגמרי מ-ClientTelemetryProbeDto (שחייב להתאים בדיוק
// למה שהבקאנד מצפה לקבל) ולא נשלח לשרת בכלל
export interface ExternalConnectivityResult {
  latencyMs: number | null;
  pingAttempts: number;
  pingFailures: number;
}

export type TelemetryStatusColor = 'Red' | 'Yellow' | 'Green';

export interface TelemetryDiagnosticReport {
  statusColor: TelemetryStatusColor;
  summaryTitle: string;
  actionableRecommendation: string;
  isIssueLocalToClient: boolean;
  isFixableByRestart: boolean;
}

export interface OpsSummaryDto {
  totalRequests: number;
  failedRequests: number;
  medianResponseTimeMs: number;
  generatedAt: string;
}

export interface MetricPointDto {
  timestamp: string;
  value: number | null;
}

// "האם Azure עצמו מסמן את המשאב הזה בדיוק כ-Unavailable/Degraded" - לא
// נגזר מהמדדים שמסביב, שאלה נפרדת לגמרי (ראו AzureResourceHealthReader)
export interface ResourceHealthStatusDto {
  availabilityState: string;
  title: string | null;
  summary: string | null;
  reportedTime: string | null;
}

// ספירות אירועים נקודתיים (לא אחוזי ניצול לאורך זמן) - מגיע מ-Diagnostic
// Settings שמוזרמים ל-Log Analytics, לא ממדדי Azure Monitor הרגילים
export interface SqlDiagnosticSummaryDto {
  errorsCount: number;
  blocksCount: number;
  deadlocksCount: number;
  timeoutsCount: number;
  generatedAt: string;
}

export interface SqlHealthMetricsDto {
  dtuPercent: MetricPointDto[];
  workersPercent: MetricPointDto[];
  sessionsPercent: MetricPointDto[];
  generatedAt: string;
  resourceHealth: ResourceHealthStatusDto | null;
  diagnosticSummary: SqlDiagnosticSummaryDto | null;
}

export interface AppServiceHealthMetricsDto {
  cpuTimeSeconds: MetricPointDto[];
  memoryWorkingSetBytes: MetricPointDto[];
  requests: MetricPointDto[];
  http5xx: MetricPointDto[];
  averageResponseTimeSeconds: MetricPointDto[];
  httpQueueLength: MetricPointDto[];
  generatedAt: string;
  resourceHealth: ResourceHealthStatusDto | null;
}

// תקלה שמיקרוסופט עצמה מכריזה עליה (Service Issue / Planned Maintenance /
// Health Advisory) ברמת ה-subscription/אזור - לא נגזר ממדדים שלנו, שונה
// מהותית מ-AppServiceHealthMetricsDto/SqlHealthMetricsDto
export interface ServiceHealthEventDto {
  eventType: string;
  status: string;
  title: string;
  summary: string | null;
  lastUpdateTime: string | null;
  impactedServices: string[];
}

export interface AzureServiceHealthDto {
  activeEvents: ServiceHealthEventDto[];
  generatedAt: string;
}
