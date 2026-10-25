import React, { useState } from 'react';
import type { AuthUser } from '../types/auth.types';
import { UserRole, isAdminOrAbove } from '../types/auth.types';
import { colors } from '../styles/theme';
import { ChangePasswordModal } from './ChangePasswordModal';

export type DashboardView = 'incidents' | 'bugs' | 'new-bug' | 'about' | 'azure-health' | 'security' | 'offices' | 'failed-incidents' | 'login-security';

interface NavbarProps {
  currentView: DashboardView;
  onViewChange: (view: DashboardView) => void;
  openIncidentsCount: number;
  newIncidentsCount: number;
  officesOpenCount: number;
  failedIncidentsCount: number;
  blockedIpsCount: number;
  user: AuthUser;
  onLogout: () => void;
}

const NavCountBadge: React.FC<{ count: number }> = ({ count }) => (
  count > 0 ? (
    <span style={{
      backgroundColor: colors.danger,
      color: '#fff',
      fontSize: '11px',
      fontWeight: 700,
      padding: '2px 7px',
      borderRadius: '999px'
    }}>
      {count}
    </span>
  ) : null
);

export const Navbar: React.FC<NavbarProps> = ({ currentView, onViewChange, openIncidentsCount, newIncidentsCount, officesOpenCount, failedIncidentsCount, blockedIpsCount, user, onLogout }) => {
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
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

        {/* "חדשות מאז הביקור האחרון" - סימן נפרד לגמרי מהנקודה/תג האדומים
            שעל כפתור הניטור (שמציינים "סך הכל פתוחות"); בכוונה צבע/צורה שונים
            לגמרי כדי שלא יתבלבלו ביניהם, ובלי אנימציית פעימה */}
        {newIncidentsCount > 0 && (
          <span
            title={`${newIncidentsCount} תקריות חדשות מאז הביקור האחרון שלך`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '999px',
              backgroundColor: colors.card,
              border: `1px solid ${colors.violet}`,
              color: '#c4b5fd',
              fontSize: '11.5px',
              fontWeight: 700,
            }}
          >
            🔔 {newIncidentsCount} חדשות
          </span>
        )}
      </div>

      <nav style={{ display: 'flex', gap: '8px', backgroundColor: colors.card, padding: '4px', borderRadius: '10px' }}>
        <button
          onClick={() => onViewChange('incidents')}
          style={getNavBtnStyle('incidents')}
        >
          <span>ניטור תקלות מערכת</span>
          <NavCountBadge count={openIncidentsCount} />
        </button>

        <button
          onClick={() => onViewChange('new-bug')}
          style={getNavBtnStyle('new-bug')}
        >
          <span>+ דיווח תקלה חדשה</span>
        </button>

        {/* ניטור תקלות ודיווח תקלה חדשה - היחידים שגלויים למנהלי משרד ולעובדים
            רגילים. כל השאר (מידע כללי, אבטחה, תשתית, סקירה חוצת-לקוחות) זמינים
            רק ל-SiteAdmin - החלטה מפורשת, לא רק "אין להם צורך" */}
        {user.role === UserRole.SiteAdmin && (
          <>
            <button
              onClick={() => onViewChange('about')}
              style={getNavBtnStyle('about')}
            >
              <span>מה המערכת מזהה?</span>
            </button>

            <button
              onClick={() => onViewChange('security')}
              style={getNavBtnStyle('security')}
            >
              <span>אבטחה ואמון</span>
            </button>

            <button
              onClick={() => onViewChange('azure-health')}
              style={getNavBtnStyle('azure-health')}
            >
              <span>בריאות תשתית Azure</span>
            </button>

            <button
              onClick={() => onViewChange('offices')}
              style={getNavBtnStyle('offices')}
            >
              <span>סקירת משרדים</span>
              <NavCountBadge count={officesOpenCount} />
            </button>

            <button
              onClick={() => onViewChange('failed-incidents')}
              style={getNavBtnStyle('failed-incidents')}
            >
              <span>תקריות שנכשלו</span>
              <NavCountBadge count={failedIncidentsCount} />
            </button>

            <button
              onClick={() => onViewChange('login-security')}
              style={getNavBtnStyle('login-security')}
            >
              <span>אבטחת כניסה</span>
              <NavCountBadge count={blockedIpsCount} />
            </button>
          </>
        )}
      </nav>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '30px',
            height: '30px',
            borderRadius: '50%',
            backgroundColor: isAdminOrAbove(user.role) ? colors.violet : colors.border,
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
              color: isAdminOrAbove(user.role) ? '#c4b5fd' : colors.textFaint,
              lineHeight: 1,
            }}>
              {user.role === UserRole.SiteAdmin ? 'מנהל-על' : user.role === UserRole.Admin ? 'מנהל מערכת' : 'משתמש'}
            </span>
          </div>
        </div>

        <button
          onClick={() => setIsChangePasswordOpen(true)}
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
          שינוי סיסמה
        </button>

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

      <ChangePasswordModal isOpen={isChangePasswordOpen} onClose={() => setIsChangePasswordOpen(false)} />
    </header>
  );
};
