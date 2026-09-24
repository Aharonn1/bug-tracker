import type { BugReport, CreateBugDto } from '../types/bug.types';
import { BugStatus } from '../types/bug.types';

import { API_BASE_URL, tenantHeaders } from '../config';

const BASE_URL = `${API_BASE_URL}/api/Bugs`;

export const bugService = {
  async getAll(status?: BugStatus): Promise<BugReport[]> {
    const url = status !== undefined 
      ? `${BASE_URL}?status=${status}` 
      : BASE_URL;

    const res = await fetch(url, {
      headers: tenantHeaders({
        'Accept': 'application/json'
      })
    });

    if (!res.ok) {
      throw new Error(`שגיאה בטעינת באגים (${res.status})`);
    }

    return res.json();
  },

  async getById(id: number): Promise<BugReport> {
    const res = await fetch(`${BASE_URL}/${id}`, {
      headers: tenantHeaders({
        'Accept': 'application/json'
      })
    });

    if (!res.ok) {
      throw new Error(`באג #${id} לא נמצא (${res.status})`);
    }

    return res.json();
  },

  async create(dto: CreateBugDto): Promise<BugReport> {
    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: tenantHeaders({
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }),
      body: JSON.stringify(dto),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => null);
      throw new Error(errorData?.message || `כשל ביצירת באג חדש (${res.status})`);
    }

    return res.json();
  },

  async updateStatus(id: number, status: BugStatus): Promise<BugReport> {
    const res = await fetch(`${BASE_URL}/${id}/status`, {
      method: 'PATCH',
      headers: tenantHeaders({
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }),
      body: JSON.stringify({ status }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => null);
      throw new Error(errorData?.message || `כשל בעדכון סטטוס באג #${id} (${res.status})`);
    }

    return res.json();
  },

  async delete(id: number): Promise<void> {
    const res = await fetch(`${BASE_URL}/${id}`, {
      method: 'DELETE',
      headers: tenantHeaders(),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => null);
      throw new Error(errorData?.message || `כשל במחיקת באג #${id} (${res.status})`);
    }
  },
};