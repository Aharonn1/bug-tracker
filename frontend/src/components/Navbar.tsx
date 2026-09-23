import React from 'react';

export type DashboardView = 'incidents' | 'bugs' | 'new-bug';

interface NavbarProps {
  currentView: DashboardView;
  onViewChange: (view: DashboardView) => void;
  openIncidentsCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, onViewChange, openIncidentsCount }) => {
  const getNavBtnStyle = (view: DashboardView): React.CSSProperties => {
    const isActive = currentView === view;
    return {
      padding: '8px 16px',
      borderRadius: '8px',
      border: 'none',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: 600,
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      transition: 'all 0.2s ease',
      backgroundColor: isActive ? '#2563eb' : 'transparent',
      color: isActive ? '#ffffff' : '#94a3b8',
    };
  };

  return (
    <header style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '14px 28px',
      backgroundColor: '#0f172a',
      borderBottom: '1px solid #1e293b',
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      direction: 'rtl'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            backgroundColor: openIncidentsCount > 0 ? '#ef4444' : '#22c55e',
            boxShadow: openIncidentsCount > 0 ? '0 0 10px #ef4444' : '0 0 8px #22c55e',
            animation: openIncidentsCount > 0 ? 'pulse 1.8s infinite' : 'none'
          }} />
          <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#f8fafc', letterSpacing: '-0.3px' }}>
            מרכז ניטור ותקלות מערכת
          </h1>
        </div>
        <span style={{ color: '#475569', fontSize: '14px' }}>|</span>
        <span style={{ color: '#64748b', fontSize: '13px' }}>אינטגרציות ממשלתיות וליבה</span>
      </div>

      <nav style={{ display: 'flex', gap: '8px', backgroundColor: '#1e293b', padding: '4px', borderRadius: '10px' }}>
        <button
          onClick={() => onViewChange('incidents')}
          style={getNavBtnStyle('incidents')}
        >
          <span>ניטור שגיאות ממשלתיות</span>
          {openIncidentsCount > 0 && (
            <span style={{
              backgroundColor: '#ef4444',
              color: '#fff',
              fontSize: '11px',
              fontWeight: 700,
              padding: '2px 7px',
              borderRadius: '999px'
            }}>
              {openIncidentsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => onViewChange('bugs')}
          style={getNavBtnStyle('bugs')}
        >
          <span>ניהול באגים כללי</span>
        </button>

        <button
          onClick={() => onViewChange('new-bug')}
          style={getNavBtnStyle('new-bug')}
        >
          <span>+ דיווח תקלה חדשה</span>
        </button>
      </nav>
    </header>
  );
};