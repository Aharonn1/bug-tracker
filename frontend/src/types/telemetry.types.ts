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
