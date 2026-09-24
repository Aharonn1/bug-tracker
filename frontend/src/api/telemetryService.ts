import type { ClientTelemetryProbeDto, OpsSummaryDto, TelemetryDiagnosticReport } from '../types/telemetry.types';
import { API_BASE_URL, tenantHeaders } from '../config';

const BASE_URL = `${API_BASE_URL}/api/Telemetry`;

export const telemetryService = {
  async probe(dto: ClientTelemetryProbeDto): Promise<TelemetryDiagnosticReport> {
    const res = await fetch(`${BASE_URL}/probe`, {
      method: 'POST',
      headers: tenantHeaders({
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      }),
      body: JSON.stringify(dto),
    });

    if (!res.ok) throw new Error(`כשל בבדיקת איכות החיבור (${res.status})`);
    return res.json();
  },

  async getOpsSummary(minutes: number): Promise<OpsSummaryDto | null> {
    const res = await fetch(`${BASE_URL}/ops-summary?minutes=${minutes}`, {
      headers: tenantHeaders({ Accept: 'application/json' }),
    });

    if (res.status === 204) return null;
    if (!res.ok) throw new Error(`כשל בטעינת נתוני ניטור (${res.status})`);
    return res.json();
  },
};
