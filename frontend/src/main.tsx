import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'
import { AuthProvider } from './hooks/useAuth.tsx'
import { registerGlobalErrorHandlers } from './utils/globalErrorHandlers'
import { flushPendingReports } from './utils/errorReporting'

registerGlobalErrorHandlers()

flushPendingReports();
window.addEventListener('online', flushPendingReports);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ErrorBoundary>
  </StrictMode>,
)
