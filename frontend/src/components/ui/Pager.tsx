import React from 'react';
import { colors, radius } from '../../styles/theme';

interface PagerProps {
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
}

export const Pager: React.FC<PagerProps> = ({ page, pageSize, totalCount, onPageChange, disabled }) => {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  if (totalCount === 0) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalCount);

  const btnStyle = (enabled: boolean): React.CSSProperties => ({
    padding: '6px 14px',
    borderRadius: radius.md,
    border: `1px solid ${colors.border}`,
    backgroundColor: enabled ? colors.card : 'transparent',
    color: enabled ? colors.textPrimary : colors.textFaint,
    fontSize: '13px',
    cursor: enabled ? 'pointer' : 'default',
  });

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        padding: '12px 4px',
        flexWrap: 'wrap',
      }}
    >
      <span style={{ fontSize: '13px', color: colors.textMuted }}>
        מציג {from}-{to} מתוך {totalCount}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={disabled || page <= 1}
          style={btnStyle(!disabled && page > 1)}
        >
          ‹ הקודם
        </button>
        <span style={{ fontSize: '13px', color: colors.textSecondary, fontVariantNumeric: 'tabular-nums' }}>
          עמוד {page} מתוך {totalPages}
        </span>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={disabled || page >= totalPages}
          style={btnStyle(!disabled && page < totalPages)}
        >
          הבא ›
        </button>
      </div>
    </div>
  );
};

export default Pager;
