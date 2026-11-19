import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import * as signalR from '@microsoft/signalr';
import { API_BASE_URL, AUTH_TOKEN_STORAGE_KEY } from '../config';

const HUB_URL = `${API_BASE_URL}/hubs/incidents`;

// חיבור push בזמן-אמת - תוספת לצד הפולינג הקיים (useNewIncidentsCount,
// useIncidents), לא תחליף מלא: אם החיבור נכשל (רשת ארגונית חוסמת WebSocket,
// ניתוק זמני) הפולינג האיטי יותר עדיין מביא עדכון בסוף - בדיוק אותו עיקרון
// resilience כמו שאר האפליקציה (fallback, לא נקודת-כשל יחידה).
// withAutomaticReconnect כבר נותן ניסיונות חיבור-מחדש מובנים - לא צריך
// לממש את זה ידנית
export function useIncidentPushUpdates() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
    if (!token) return;

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(HUB_URL, {
        accessTokenFactory: () => localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) ?? '',
      })
      .withAutomaticReconnect()
      .build();

    // מרעננים גם את התג (newIncidentsCount) וגם את הרשימה עצמה (incidents) -
    // כך תקרית חדשה מופיעה כמעט-מיידית גם למי שכבר על מסך התקריות, לא רק
    // מעדכנת תג בניווט שהוא יבחין בו רק בביקור הבא
    connection.on('newIncident', () => {
      queryClient.invalidateQueries({ queryKey: ['newIncidentsCount'] });
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
    });

    connection.start().catch(() => {
      // best-effort בכוונה - אם זה נכשל (למשל WebSocket חסום), הפולינג
      // הקיים עדיין עובד בלעדיו, אז אין צורך ב-retry ידני כאן
    });

    return () => {
      connection.stop();
    };
  }, [queryClient]);
}
