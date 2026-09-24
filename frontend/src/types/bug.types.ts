
// הערכים תואמים בכוונה ל-enum IncidentSeverity בבקאנד (byte, מתחיל מ-1) - ה-DTO
// שנשלח ליצירת באג נשמר תחת אותו enum בפועל
export const BugPriority = {
  Low: 1,
  Medium: 2,
  High: 3,
  Critical: 4,
} as const;

export type BugPriority = (typeof BugPriority)[keyof typeof BugPriority];

// הערכים תואמים בכוונה ל-enum IncidentStatus בבקאנד (byte, מתחיל מ-1) - הבאג
// נשמר בפועל תחת אותו enum, אז שליחת ערך שלא תואם נשמרת/מוצגת לא נכון
export const BugStatus = {
  New: 1,
  UnderInvestigation: 2,
  RootCauseIdentified: 3,
  RemediationPendingApproval: 4,
  Remediated: 5,
  Closed: 6,
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

// תואם ל-enum IncidentSeverity בבקאנד - ראו הערה מעל BugPriority
export const IncidentSeverity = {
  Low: 1,
  Medium: 2,
  High: 3,
  Critical: 4,
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
  severity: IncidentSeverity;
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
