import React, { Suspense, lazy, useState } from 'react';
import { Navbar } from './components/Navbar';
import type { DashboardView } from './components/Navbar';
import { useIncidents } from './hooks/useIncidents';
import { useAuth } from './hooks/useAuth';
import type { AuthUser } from './types/auth.types';
import { ConnectionDiagnosticBanner } from './components/ConnectionDiagnosticBanner';
import { DbOutageBanner } from './components/DbOutageBanner';
import { NewVersionBanner } from './components/NewVersionBanner';
import { LoginForm } from './components/LoginForm';
import { RegisterForm } from './components/RegisterForm';
// נטען מיידית (לא lazy) כי זה ה-view הראשון שכל משתמש רואה אחרי login -
// טעינה עצלה הייתה רק מוסיפה פנייה רשתית מיותרת לפני הצגת המסך הראשי
import { IncidentsPage } from './pages/IncidentsPage';
import { colors } from './styles/theme';

// שאר העמודים נטענים רק כשבאמת נכנסים אליהם - כל אחד מהם מכיל קוד שרוב
// המשתמשים (לא-Admin) לעולם לא פותחים (Azure health dashboards, load-test
// tool, סוכן AI). בלי זה, כל משתמש היה מוריד ומפענח את כל הקוד הזה כבר
// בטעינה הראשונה, גם אם הוא אף פעם לא מגיע לשם
const TriagePage = lazy(() => import('./pages/TriagePage'));
const AboutMonitoringPage = lazy(() => import('./pages/AboutMonitoringPage'));
const AzureInfrastructureHealthPage = lazy(() => import('./pages/AzureInfrastructureHealthPage'));
const BugsPage = lazy(() => import('./pages/BugsPage'));
const NewBugPage = lazy(() => import('./pages/NewBugPage'));

const PageLoadingFallback: React.FC = () => (
  <div style={{ padding: '40px', textAlign: 'center', color: colors.textMuted }}>
    טוען...
  </div>
);

const AuthGate: React.FC = () => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const { sessionExpiredMessage } = useAuth();

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.bg,
      direction: 'rtl',
      padding: '20px',
      boxSizing: 'border-box',
      gap: '16px',
    }}>
      {sessionExpiredMessage && (
        <div style={{
          padding: '10px 16px',
          backgroundColor: colors.warningBg,
          border: `1px solid ${colors.warning}`,
          borderRadius: '8px',
          color: colors.warningSoft,
          fontSize: '13px',
          maxWidth: '380px',
          width: '100%',
          textAlign: 'center',
          boxSizing: 'border-box',
        }}>
          {sessionExpiredMessage}
        </div>
      )}
      {mode === 'login' ? (
        <LoginForm onSwitchToRegister={() => setMode('register')} />
      ) : (
        <RegisterForm onSwitchToLogin={() => setMode('login')} />
      )}
    </div>
  );
};

const Dashboard: React.FC<{ user: AuthUser; onLogout: () => void }> = ({ user, onLogout }) => {
  const [currentView, setCurrentView] = useState<DashboardView>('incidents');

  const {
    incidents,
    totalCount,
    page,
    setPage,
    pageSize,
    loading,
    error,
    filterSubsystem,
    setFilterSubsystem,
    unresolvedOnly,
    setUnresolvedOnly,
    resolveIncident,
    reload
  } = useIncidents();

  // מבוסס על העמוד הנוכחי בלבד (לא כל התקריות הפתוחות בכל הטננט) - נכון
  // כל עוד יש פחות תקריות מגודל העמוד. ספירה מדויקת לגמרי דורשת endpoint
  // ייעודי לספירה בצד השרת, לא תלוי בעמוד שנטען כרגע
  const openIncidentsCount = incidents.filter(i => !i.isResolved).length;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: colors.bg }}>
      <Navbar
        currentView={currentView}
        onViewChange={setCurrentView}
        openIncidentsCount={openIncidentsCount}
        unhandledCount={openIncidentsCount}
        user={user}
        onLogout={onLogout}
      />

      <main style={{ flex: 1, padding: '28px 40px', width: '100%', boxSizing: 'border-box' }}>
        <NewVersionBanner />
        <DbOutageBanner />
        <ConnectionDiagnosticBanner />

        {currentView === 'incidents' && (
          <IncidentsPage
            incidents={incidents}
            totalCount={totalCount}
            page={page}
            setPage={setPage}
            pageSize={pageSize}
            loading={loading}
            error={error}
            filterSubsystem={filterSubsystem}
            setFilterSubsystem={setFilterSubsystem}
            unresolvedOnly={unresolvedOnly}
            setUnresolvedOnly={setUnresolvedOnly}
            resolveIncident={resolveIncident}
            reload={reload}
          />
        )}

        <Suspense fallback={<PageLoadingFallback />}>
          {currentView === 'triage' && <TriagePage incidents={incidents} />}

          {currentView === 'about' && <AboutMonitoringPage />}

          {currentView === 'azure-health' && <AzureInfrastructureHealthPage />}

          {currentView === 'bugs' && <BugsPage />}

          {currentView === 'new-bug' && (
            <NewBugPage onBugCreated={() => setCurrentView('bugs')} />
          )}
        </Suspense>
      </main>
    </div>
  );
};

export const App: React.FC = () => {
  const { user, logout } = useAuth();

  if (!user) {
    return <AuthGate />;
  }

  return <Dashboard user={user} onLogout={logout} />;
};

export default App;
