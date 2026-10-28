import React from 'react';
import type { ResourceHealthStatusDto } from '../../types/telemetry.types';
import { colors } from '../../styles/theme';

interface Props {
  health: ResourceHealthStatusDto | null;
}

// "האם Azure עצמו מסמן את המשאב הזה כ-Unavailable/Degraded" - לא נגזר
// מהמדדים שמסביב בכרטיס (CPU/latency וכו'), שאלה נפרדת. משותף בין
// AzureAppServiceHealthCard ו-AzureSqlHealthCard - אותה לוגיקת תצוגה
// בדיוק בשני המקומות, לא כפילות מקרית
export const ResourceHealthBadge: React.FC<Props> = ({ health }) => {
  if (!health) return null;

  const { bg, border, text, icon } =
    health.availabilityState === 'Available'
      ? { bg: colors.successBg, border: colors.success, text: colors.successSoft, icon: '✓' }
      : health.availabilityState === 'Degraded'
        ? { bg: colors.warningBg, border: colors.warning, text: colors.warningSoft, icon: '⚠' }
        : health.availabilityState === 'Unavailable'
          ? { bg: colors.dangerBg, border: colors.dangerBorder, text: colors.dangerSoft, icon: '✗' }
          : { bg: colors.card, border: colors.border, text: colors.textMuted, icon: '?' };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px',
        padding: '10px 14px',
        borderRadius: '8px',
        backgroundColor: bg,
        border: `1px solid ${border}`,
        marginBottom: '14px',
      }}
    >
      <span style={{ fontSize: '14px' }}>{icon}</span>
      <div>
        <div style={{ fontSize: '13px', fontWeight: 700, color: text }}>
          Resource Health: {health.title || health.availabilityState}
        </div>
        {health.summary && (
          <div style={{ fontSize: '12px', color: colors.textFaint, marginTop: '2px' }}>{health.summary}</div>
        )}
      </div>
    </div>
  );
};

export default ResourceHealthBadge;
