import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import type { DashboardView } from './components/Navbar';
import { useIncidents } from './hooks/useIncidents';
import { IncidentMetrics } from './components/IncidentMetrics';
import BugForm from './components/BugForm';
import { BugList } from './components/BugList';
import { IncidentTable } from './components/IncidentTable';
import { ConnectionDiagnosticBanner } from './components/ConnectionDiagnosticBanner';
import { OpsSummaryPanel } from './components/OpsSummaryPanel';

export const App: React.FC = () => {
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
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#0b0f19' }}>
      <Navbar
        currentView={currentView}
        onViewChange={setCurrentView}
        openIncidentsCount={openIncidentsCount}
      />

      <main style={{ flex: 1, padding: '28px', maxWidth: '1440px', width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
        <ConnectionDiagnosticBanner />

        {currentView === 'incidents' && (
          <section>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '20px', color: '#f8fafc' }}>
                  מוקד בקרה ואירועי קצה (NOC)
                </h2>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#94a3b8' }}>
                  מעקב חריגות תהיל״ה, נט המשפט ומערכות הוצאה לפועל
                </p>
              </div>

              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <select
                  value={filterSubsystem}
                  onChange={(e) => setFilterSubsystem(e.target.value)}
                  style={{
                    backgroundColor: '#1e293b',
                    color: '#cbd5e1',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    padding: '8px 14px',
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  <option value="">כל המערכות הממשלתיות</option>
                  <option value="NetHaMishpat">נט המשפט</option>
                  <option value="EcaGov">רשות האכיפה והגבייה</option>
                  <option value="DocumentEngine">מנוע חתימה ומסמכים</option>
                </select>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#cbd5e1', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={unresolvedOnly}
                    onChange={(e) => setUnresolvedOnly(e.target.checked)}
                    style={{ cursor: 'pointer', accentColor: '#2563eb' }}
                  />
                  תקלות פתוחות בלבד
                </label>

                <button
                  onClick={reload}
                  style={{
                    backgroundColor: '#1e293b',
                    color: '#94a3b8',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    padding: '8px 14px',
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  רענן נתונים ↻
                </button>
              </div>
            </div>

            <OpsSummaryPanel />

            <IncidentMetrics incidents={incidents} />

            {error && (
              <div style={{ padding: '14px', backgroundColor: '#450a0a', border: '1px solid #991b1b', borderRadius: '8px', color: '#fca5a5', marginBottom: '20px', fontSize: '13px' }}>
                {error}
              </div>
            )}

           {loading ? (
  <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>טוען נתונים ממסד הנתונים...</div>
) : (
  <IncidentTable incidents={incidents} onResolve={resolveIncident} />
)}
          </section>
        )}

        {currentView === 'bugs' && (
          <section>
            <div style={{ marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '20px', color: '#f8fafc' }}>רשימת באגים כלליים</h2>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#94a3b8' }}>מעקב תקלות פיתוח פנימיות</p>
            </div>
            <BugList />
          </section>
        )}

        {currentView === 'new-bug' && (
          <section style={{ maxWidth: '640px', margin: '0 auto' }}>
            <div style={{ marginBottom: '20px', textAlign: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '20px', color: '#f8fafc' }}>דיווח באג חדש</h2>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#94a3b8' }}>פתיחת קריאת שירות לשכבת הליבה</p>
            </div>
            <BugForm onBugCreated={() => setCurrentView('bugs')} />
          </section>
        )}
      </main>
    </div>
  );
};

export default App;