
export const BugPriority = {
  Low: 0,
  Medium: 1,
  High: 2,
  Critical: 3,
} as const;

export type BugPriority = (typeof BugPriority)[keyof typeof BugPriority];

export const BugStatus = {
  Open: 0,
  InProgress: 1,
  Resolved: 2,
} as const;

export type BugStatus = (typeof BugStatus)[keyof typeof BugStatus];

export interface BugReport {
  id: number;
  title: string;
  description: string;
  systemModule: string;
  priority: BugPriority;
  status: BugStatus;
  createdAt: string;
  resolvedAt: string | null;
}

export interface CreateBugDto {
  title: string;
  description: string;
  systemModule: string;
  priority: BugPriority;
}

export const IncidentSeverity = {
  Info: 0,
  Warning: 1,
  Error: 2,
  Critical: 3,
} as const;

export type IncidentSeverity = (typeof IncidentSeverity)[keyof typeof IncidentSeverity];

export const SubsystemType = {
  NetHaMishpat: 'NetHaMishpat',
  EcaGov: 'EcaGov',
  DocumentEngine: 'DocumentEngine',
  CoreBanking: 'CoreBanking',
  WebClient: 'WebClient',
} as const;

export type SubsystemType = (typeof SubsystemType)[keyof typeof SubsystemType];

export interface SystemIncident {
  incidentId: number;
  errorCode: string;
  category: string;
  subsystem: SubsystemType | string;
  severityLevel: IncidentSeverity;
  hebrewDescription: string;
  caseNumber: string | null;
  externalReferenceId: string | null;
  clientStationId: string | null;
  userId: string | null;
  errorMessage: string;
  resolutionPlaybook: string | null;
  isResolved: boolean;
  createdAt: string;
  resolvedAt: string | null;
}

export interface CreateIncidentDto {
  tenantId: string;
  errorCode: string;
  caseNumber?: string | null;
  externalReferenceId?: string | null;
  clientStationId?: string | null;
  userId?: string | null;
  errorMessage: string;
  stackTrace?: string | null;
  rawPayload?: string | null;
}
