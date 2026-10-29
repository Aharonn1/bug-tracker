import React, { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { Navbar } from './components/Navbar';
import type { DashboardView } from './components/Navbar';
import { useIncidents } from './hooks/useIncidents';
import { useAuth } from './hooks/useAuth';
import { useNewIncidentsCount } from './hooks/useNewIncidentsCount';
import { useSiteAdminBadgeCounts } from './hooks/useSiteAdminBadgeCounts';
import { userService } from './api/userService';
import type { AuthUser } from './types/auth.types';
import { UserRole } from './types/auth.types';
import { ConnectionDiagnosticBanner } from './components/ConnectionDiagnosticBanner';
import { DbOutageBanner } from './components/DbOutageBanner';
import { NewVersionBanner } from './components/NewVersionBanner';
import { LoginForm } from './components/LoginForm';
import { RegisterForm } from './components/RegisterForm';
import { ForgotPasswordForm } from './components/ForgotPasswordForm';
import { ResetPasswordForm } from './components/ResetPasswordForm';
import { AuthBrandPanel } from './components/AuthBrandPanel';
// נטען מיידית (לא lazy) כי זה ה-view הראשון שכל משתמש רואה אחרי login -
// טעינה עצלה הייתה רק מוסיפה פנייה רשתית מיותרת לפני הצגת המסך הראשי
import { IncidentsPage } from './pages/IncidentsPage';
import { colors } from './styles/theme';

// שאר העמודים נטענים רק כשבאמת נכנסים אליהם - כל אחד מהם מכיל קוד שרוב
// המשתמשים (לא-Admin) לעולם לא פותחים (Azure health dashboards, load-test
// tool, סוכן AI). בלי זה, כל משתמש היה מוריד ומפענח את כל הקוד הזה כבר
// בטעינה הראשונה, גם אם הוא אף פעם לא מגיע לשם
const AboutMonitoringPage = lazy(() => import('./pages/AboutMonitoringPage'));
const AzureInfrastructureHealthPage = lazy(() => import('./pages/AzureInfrastructureHealthPage'));
const BugsPage = lazy(() => import('./pages/BugsPage'));
const NewBugPage = lazy(() => import('./pages/NewBugPage'));
const SecurityTrustPage = lazy(() => import('./pages/SecurityTrustPage'));
const OfficesOverviewPage = lazy(() => import('./pages/OfficesOverviewPage'));
const FailedIncidentsPage = lazy(() => import('./pages/FailedIncidentsPage'));
const LoginSecurityPage = lazy(() => import('./pages/LoginSecurityPage'));

const PageLoadingFallback: React.FC = () => (
  <div style={{ padding: '40px', textAlign: 'center', color: colors.textMuted }}>
    טוען...
  </div>
);

// טוקן איפוס סיסמה מגיע כפרמטר query על כתובת השורש (?resetToken=...) ולא
// כנתיב ייעודי - אין בכלל router באפליקציה (ראו comment ב-config.ts על
// TENANT_ID קבוע), אז זו הדרך הפשוטה ביותר לקשר ישירות מהמייל למסך הנכון
function getResetTokenFromUrl(): string | null {
  return new URLSearchParams(window.location.search).get('resetToken');
}

const AuthGate: React.FC = () => {
  const initialResetToken = useRef(getResetTokenFromUrl()).current;
  const [mode, setMode] = useState<'login' | 'register' | 'forgot-password' | 'reset-password'>(
    initialResetToken ? 'reset-password' : 'login'
  );
  const { sessionExpiredMessage } = useAuth();

  // מנקים את ה-query param מהכתובת אחרי שקראנו אותו - רענון מקרי של הדף לא
  // אמור להציג שוב את מסך האיפוס עם טוקן שכבר אולי נוצל
  useEffect(() => {
    if (initialResetToken) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [initialResetToken]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.bg,
      direction: 'rtl',
      padding: '24px',
      boxSizing: 'border-box',
    }}>
      <div style={{
        display: 'flex',
        width: '100%',
        maxWidth: '920px',
        borderRadius: '20px',
        overflow: 'hidden',
        boxShadow: '0 30px 80px rgba(0,0,0,0.45)',
        border: `1px solid ${colors.border}`,
      }}>
        <AuthBrandPanel />

        <div style={{
          flex: '1 1 50%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 28px',
          boxSizing: 'border-box',
          gap: '16px',
          backgroundColor: colors.bg,
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
          {mode === 'login' && (
            <LoginForm
              onSwitchToRegister={() => setMode('register')}
              onSwitchToForgotPassword={() => setMode('forgot-password')}
            />
          )}
          {mode === 'register' && (
            <RegisterForm onSwitchToLogin={() => setMode('login')} />
          )}
          {mode === 'forgot-password' && (
            <ForgotPasswordForm onBackToLogin={() => setMode('login')} />
          )}
          {mode === 'reset-password' && initialResetToken && (
            <ResetPasswordForm token={initialResetToken} onDone={() => setMode('login')} />
          )}
        </div>
      </div>
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

  const { newCount, resetToZero } = useNewIncidentsCount();
  const { officesOpenCount, failedIncidentsCount, blockedIpsCount } = useSiteAdminBadgeCounts(user.role === UserRole.SiteAdmin);

  // מסמן "נצפה" פעם אחת בלבד לכל "ביקור" בתוך מסך התקריות - לא בכל קליק
  // על עימוד/סינון כל עוד עדיין שם (loading מתחלף גם בהם, לא רק בכניסה
  // ראשונית למסך), בלי זה היינו שולחים POST מיותר על כל קליק כזה
  const markedThisVisitRef = useRef(false);

  useEffect(() => {
    if (currentView !== 'incidents') {
      markedThisVisitRef.current = false;
      return;
    }
    if (loading || markedThisVisitRef.current) return;

    markedThisVisitRef.current = true;
    userService.markIncidentsViewed()
      .then(resetToZero)
      .catch(() => { markedThisVisitRef.current = false; });
  }, [currentView, loading, resetToZero]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: colors.bg }}>
      <Navbar
        currentView={currentView}
        onViewChange={setCurrentView}
        openIncidentsCount={openIncidentsCount}
        newIncidentsCount={newCount}
        officesOpenCount={officesOpenCount}
        failedIncidentsCount={failedIncidentsCount}
        blockedIpsCount={blockedIpsCount}
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
          {currentView === 'about' && <AboutMonitoringPage />}

          {currentView === 'security' && <SecurityTrustPage />}

          {currentView === 'azure-health' && <AzureInfrastructureHealthPage />}

          {currentView === 'offices' && <OfficesOverviewPage />}

          {currentView === 'failed-incidents' && <FailedIncidentsPage />}

          {currentView === 'login-security' && <LoginSecurityPage />}

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
