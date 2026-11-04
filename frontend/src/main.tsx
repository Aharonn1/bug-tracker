import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryCache, QueryClient, QueryClientProvider, MutationCache } from '@tanstack/react-query'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'
import { AuthProvider } from './hooks/useAuth.tsx'
import { registerGlobalErrorHandlers } from './utils/globalErrorHandlers'
import { flushPendingReports, reportHandledApiFailure } from './utils/errorReporting'

// onError מרוכז פה - לפני ההגירה, כל hook קרא ל-reportHandledApiFailure
// בעצמו בכל catch. עכשיו זו נקודה אחת שמכסה כל query/mutation בכל
// האפליקציה, כולל reportHandledApiFailure.ignore-SessionExpiredError
// הקיים כבר. staleTime לא 0 (ברירת המחדל) כדי שמעבר/חזרה למסך לא יפעיל
// fetch מיידי מחדש על נתונים בני שניות בודדות - 30 שניות סביר לדשבורד
// ניטור. refetchOnWindowFocus נשאר true (ברירת המחדל) בכוונה - כמה
// hooks כבר מימשו ידנית בדיוק את זה (רענון כשחוזרים לטאב), אז זה
// ההתנהגות הנכונה לאפליקציה הזו, לא רק ברירת מחדל שלא נבדקה
const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: reportHandledApiFailure,
  }),
  mutationCache: new MutationCache({
    onError: reportHandledApiFailure,
  }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
    },
  },
})

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
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
)
