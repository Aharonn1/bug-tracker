import { useState, useEffect, useCallback } from 'react';
import type { SystemIncident } from '../types/bug.types';
import { API_BASE_URL, tenantHeaders } from '../config';

export const useIncidents = () => {
  const [incidents, setIncidents] = useState<SystemIncident[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [filterSubsystem, setFilterSubsystem] = useState<string>('');
  const [unresolvedOnly, setUnresolvedOnly] = useState<boolean>(false);

  const loadIncidents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (unresolvedOnly) params.append('unresolvedOnly', 'true');
      if (filterSubsystem) params.append('subsystem', filterSubsystem);

      const query = params.toString() ? `?${params.toString()}` : '';
      const targetUrl = `${API_BASE_URL}/api/Incidents${query}`;
      
      console.log('Sending GET to:', targetUrl);
      const res = await fetch(targetUrl, {
        method: 'GET',
        headers: tenantHeaders({ 'Accept': 'application/json' })
      });

      if (!res.ok) {
        throw new Error(`שרת ה-Backend החזיר קוד שגיאה: ${res.status}`);
      }

      const data = await res.json();
      console.log('Incidents from server:', data);
      setIncidents(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Error fetching incidents:', err);
      setError(err.message || 'כשל בתקשורת מול שרת ה-API');
    } finally {
      setLoading(false);
    }
  }, [unresolvedOnly, filterSubsystem]);

  const resolveIncident = async (id: number) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/Incidents/${id}/resolve`, {
        method: 'PATCH',
        headers: tenantHeaders({ 'Accept': 'application/json' })
      });

      if (!res.ok) {
        throw new Error(`כשל בסימון תקלה כנפתרה (${res.status})`);
      }

      setIncidents(prev => prev.map(inc => 
        inc.incidentId === id ? { ...inc, isResolved: true, resolvedAt: new Date().toISOString() } : inc
      ));
    } catch (err: any) {
      alert(`שגיאה: ${err.message}`);
    }
  };

  useEffect(() => {
    loadIncidents();
  }, [loadIncidents]);

  return {
    incidents,
    loading,
    error,
    filterSubsystem,
    setFilterSubsystem,
    unresolvedOnly,
    setUnresolvedOnly,
    reload: loadIncidents,
    resolveIncident,
  };
};