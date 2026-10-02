import React, { useState } from 'react';
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
import { IncidentsPage } from './pages/IncidentsPage';
import { TriagePage } from './pages/TriagePage';
import { BugsPage } from './pages/BugsPage';
import { NewBugPage } from './pages/NewBugPage';
import { colors } from './styles/theme';

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
    loading,
    error,
    filterSubsystem,
    setFilterSubsystem,
    unresolvedOnly,
    setUnresolvedOnly,
    resolveIncident,
    reload
  } = useIncidents();

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

        {currentView === 'triage' && <TriagePage incidents={incidents} />}

        {currentView === 'bugs' && <BugsPage />}

        {currentView === 'new-bug' && (
          <NewBugPage onBugCreated={() => setCurrentView('bugs')} />
        )}
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
