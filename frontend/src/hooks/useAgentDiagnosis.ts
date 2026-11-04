import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { incidentService } from '../api/incidentService';
import type { SystemIncident } from '../types/bug.types';

// מרכז את הלוגיקה של הרצת סוכן ה-AI על תקרית ותצוגתה במודאל - משותף בין
// כל מקום שצריך כפתור "חקור/בדוק עם AI" (טבלת התקריות, פאנל הטריאז').
// activeIncident/modalOpen נשארים useState מקומי בכוונה - זה state של UI
// (איזה מודאל פתוח ועל איזו תקרית), לא נתון מהשרת, אז הוא לא שייך ל-React
// Query. onError בונה טקסט שגיאה מקומי ב-agentReport (לא alert/throw) -
// זה הדפדפן המקורי, נשמר כמו שהיה
export function useAgentDiagnosis() {
  const [modalOpen, setModalOpen] = useState(false);
  const [activeIncident, setActiveIncident] = useState<SystemIncident | null>(null);

  const mutation = useMutation({
    mutationFn: (incidentId: number) => incidentService.diagnoseWithAgent(incidentId),
  });

  const runAgent = (incident: SystemIncident) => {
    setActiveIncident(incident);
    setModalOpen(true);
    mutation.mutate(incident.incidentId);
  };

  const modalProps = {
    isOpen: modalOpen,
    onClose: () => setModalOpen(false),
    incidentId: activeIncident?.incidentId ?? null,
    caseNumber: activeIncident?.caseNumber ?? null,
    errorCode: activeIncident?.errorCode ?? null,
    report: mutation.isError
      ? `שגיאה בהפעלת הסוכן: ${mutation.error.message}`
      : (mutation.data?.agentReport ?? null),
    isLoading: mutation.isPending,
  };

  return { runAgent, modalProps };
}
