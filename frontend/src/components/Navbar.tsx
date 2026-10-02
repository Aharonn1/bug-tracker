import React from 'react';
import type { AuthUser } from '../types/auth.types';
import { UserRole } from '../types/auth.types';
import { colors } from '../styles/theme';

export type DashboardView = 'incidents' | 'bugs' | 'new-bug';

interface NavbarProps {
  currentView: DashboardView;
  onViewChange: (view: DashboardView) => void;
  openIncidentsCount: number;
  user: AuthUser;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, onViewChange, openIncidentsCount, user, onLogout }) => {
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
      transition: 'background-color 0.15s ease, color 0.15s ease',
      backgroundColor: isActive ? colors.accent : 'transparent',
      color: isActive ? '#ffffff' : colors.textMuted,
    };
  };

  const initials = user.fullName.split(' ').map((p) => p[0]).slice(0, 2).join('');

  return (
    <header style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '14px 28px',
      backgroundColor: colors.surface,
      borderBottom: `1px solid ${colors.borderSubtle}`,
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      direction: 'rtl',
      flexWrap: 'wrap',
      gap: '12px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            backgroundColor: openIncidentsCount > 0 ? colors.danger : colors.success,
            boxShadow: openIncidentsCount > 0 ? `0 0 10px ${colors.danger}` : `0 0 8px ${colors.success}`,
            animation: openIncidentsCount > 0 ? 'pulse 1.8s infinite' : 'none'
          }} />
          <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: colors.textPrimary, letterSpacing: '-0.3px' }}>
            מרכז ניטור ותקלות מערכת
          </h1>
        </div>
        <span style={{ color: colors.border, fontSize: '14px' }}>|</span>
        <span style={{ color: colors.textFaint, fontSize: '13px' }}>אינטגרציות ממשלתיות וליבה</span>
      </div>

      <nav style={{ display: 'flex', gap: '8px', backgroundColor: colors.card, padding: '4px', borderRadius: '10px' }}>
        <button
          onClick={() => onViewChange('incidents')}
          style={getNavBtnStyle('incidents')}
        >
          <span>ניטור שגיאות ממשלתיות</span>
          {openIncidentsCount > 0 && (
            <span style={{
              backgroundColor: colors.danger,
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

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '30px',
            height: '30px',
            borderRadius: '50%',
            backgroundColor: user.role === UserRole.Admin ? colors.violet : colors.border,
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            fontWeight: 700,
            flexShrink: 0,
          }}>
            {initials}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '13px', color: colors.textSecondary, fontWeight: 600, lineHeight: 1 }}>{user.fullName}</span>
            <span style={{
              fontSize: '10.5px',
              fontWeight: 600,
              color: user.role === UserRole.Admin ? '#c4b5fd' : colors.textFaint,
              lineHeight: 1,
            }}>
              {user.role === UserRole.Admin ? 'מנהל מערכת' : 'משתמש'}
            </span>
          </div>
        </div>

        <button
          onClick={onLogout}
          style={{
            padding: '7px 14px',
            borderRadius: '8px',
            border: `1px solid ${colors.border}`,
            backgroundColor: 'transparent',
            color: colors.textMuted,
            fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          התנתקות
        </button>
      </div>
    </header>
  );
};
