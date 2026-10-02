import { useState } from 'react';
import { incidentService } from '../api/incidentService';
import type { SystemIncident } from '../types/bug.types';

// מרכז את הלוגיקה של הרצת סוכן ה-AI על תקרית ותצוגתה במודאל - משותף בין
// כל מקום שצריך כפתור "חקור/בדוק עם AI" (טבלת התקריות, פאנל הטריאז')
export function useAgentDiagnosis() {
  const [modalOpen, setModalOpen] = useState(false);
  const [activeIncident, setActiveIncident] = useState<SystemIncident | null>(null);
  const [agentReport, setAgentReport] = useState<string | null>(null);
  const [isDiagnosing, setIsDiagnosing] = useState(false);

  const runAgent = async (incident: SystemIncident) => {
    setActiveIncident(incident);
    setAgentReport(null);
    setIsDiagnosing(true);
    setModalOpen(true);

    try {
      const result = await incidentService.diagnoseWithAgent(incident.incidentId);
      setAgentReport(result.agentReport);
    } catch (err: any) {
      setAgentReport(`שגיאה בהפעלת הסוכן: ${err.message}`);
    } finally {
      setIsDiagnosing(false);
    }
  };

  const modalProps = {
    isOpen: modalOpen,
    onClose: () => setModalOpen(false),
    incidentId: activeIncident?.incidentId ?? null,
    caseNumber: activeIncident?.caseNumber ?? null,
    errorCode: activeIncident?.errorCode ?? null,
    report: agentReport,
    isLoading: isDiagnosing,
  };

  return { runAgent, modalProps };
}
