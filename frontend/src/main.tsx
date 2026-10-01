import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'
import { AuthProvider } from './hooks/useAuth.tsx'
import { registerGlobalErrorHandlers } from './utils/globalErrorHandlers'
import { flushPendingReports } from './utils/errorReporting'

registerGlobalErrorHandlers()

// לא מספיק להסתמך רק על reload/online: אם רק השרת המקומי/השרת שלנו חוזר
// (לא "האינטרנט" של הדפדפן), אירוע 'online' לא יירה בכלל - בלי polling
// תקופתי, דיווח שנתקע בתור המקומי יכול להישאר שם לנצח בלי שאף אחד ינסה שוב
flushPendingReports();
window.addEventListener('online', flushPendingReports);
setInterval(flushPendingReports, 30_000);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ErrorBoundary>
  </StrictMode>,
)
