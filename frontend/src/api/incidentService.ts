import type { CreateIncidentDto, SystemIncident } from "../types/bug.types";
import { API_BASE_URL } from '../config';

const BASE_URL = `${API_BASE_URL}/api/Incidents`;

export const incidentService = {
  async getAll(unresolvedOnly?: boolean, subsystem?: string): Promise<SystemIncident[]> {
    const params = new URLSearchParams();
    if (unresolvedOnly) params.append('unresolvedOnly', 'true');
    if (subsystem) params.append('subsystem', subsystem);

    const url = params.toString() ? `${BASE_URL}?${params.toString()}` : BASE_URL;
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' }
    });

    if (!res.ok) throw new Error(`שגיאה בטעינת אירועי מערכת (${res.status})`);
    return res.json();
  },

  async getById(id: number): Promise<SystemIncident> {
    const res = await fetch(`${BASE_URL}/${id}`, {
      headers: { 'Accept': 'application/json' }
    });

    if (!res.ok) throw new Error(`אירוע #${id} לא נמצא (${res.status})`);
    return res.json();
  },

  async create(dto: CreateIncidentDto): Promise<{ message: string }> {
    const res = await fetch(`${BASE_URL}/ingest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(dto),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => null);
      throw new Error(errorData?.message || `כשל בדיווח תקלת מערכת (${res.status})`);
    }

    return res.json();
  },

  async resolve(id: number): Promise<void> {
    const res = await fetch(`${BASE_URL}/${id}/resolve`, {
      method: 'PATCH',
      headers: { 'Accept': 'application/json' }
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => null);
      throw new Error(errorData?.message || `כשל בסימון פתרון תקלה #${id} (${res.status})`);
    }
  },

  async diagnoseWithAgent(id: number): Promise<{
    incidentId: number;
    errorCode: string;
    caseNumber: string | null;
    agentReport: string;
    analyzedAt: string;
  }> {
    const res = await fetch(`${BASE_URL}/${id}/diagnose-agent`, {
      method: 'POST',
      headers: { 'Accept': 'application/json' }
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => null);
      throw new Error(errorData?.detail || errorData?.message || `כשל בהפעלת סוכן AI עבור אירוע #${id} (${res.status})`);
    }

    return res.json();
  },
};
