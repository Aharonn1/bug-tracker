import React from 'react';
import type { MonitoringCapability } from '../data/monitoringCapabilities';
import { colors, radius } from '../styles/theme';

interface Props {
  capability: MonitoringCapability | null;
  onClose: () => void;
}

export const CapabilityDetailModal: React.FC<Props> = ({ capability, onClose }) => {
  if (!capability) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        direction: 'rtl',
        backdropFilter: 'blur(4px)',
        padding: '20px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: radius.xl,
          width: '100%',
          maxWidth: '560px',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '18px 24px',
            borderBottom: `1px solid ${colors.borderSubtle}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: colors.card,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '26px' }}>{capability.icon}</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', color: colors.textPrimary, fontWeight: 700 }}>
                {capability.title}
              </h3>
              {capability.errorCode && (
                <span style={{ fontSize: '11px', color: colors.textFaint, fontFamily: 'monospace' }}>
                  {capability.errorCode}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: colors.textMuted, fontSize: '20px', cursor: 'pointer', padding: '4px 8px' }}
          >
            ✕
          </button>
        </div>

        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <section>
            <div style={{ fontSize: '12px', color: colors.textFaint, fontWeight: 600, marginBottom: '6px' }}>איך זה עובד</div>
            <div style={{ color: colors.textSecondary, fontSize: '13px', lineHeight: 1.8 }}>
              {capability.howItWorks}
            </div>
          </section>

          <section>
            <div style={{ fontSize: '12px', color: colors.textFaint, fontWeight: 600, marginBottom: '6px' }}>איפה רואים את זה</div>
            <div
              style={{
                background: colors.surfaceRaised,
                border: `1px solid ${colors.borderSubtle}`,
                borderRadius: radius.md,
                padding: '12px',
                color: colors.accentSoft,
                fontSize: '13px',
                lineHeight: 1.7,
              }}
            >
              {capability.whereToSeeIt}
            </div>
          </section>
        </div>

        <div style={{ padding: '12px 24px', borderTop: `1px solid ${colors.borderSubtle}`, display: 'flex', justifyContent: 'flex-end', background: colors.bg }}>
          <button
            onClick={onClose}
            style={{ padding: '8px 18px', background: colors.border, color: colors.textPrimary, border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}
          >
            סגור
          </button>
        </div>
      </div>
    </div>
  );
};

export default CapabilityDetailModal;
