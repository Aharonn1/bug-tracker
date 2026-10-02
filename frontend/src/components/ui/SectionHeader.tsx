import React from 'react';
import { colors } from '../../styles/theme';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ title, subtitle, actions }) => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: '12px',
      marginBottom: '20px',
    }}
  >
    <div>
      <h2 style={{ margin: 0, fontSize: '20px', color: colors.textPrimary, fontWeight: 700 }}>{title}</h2>
      {subtitle && (
        <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: colors.textMuted }}>{subtitle}</p>
      )}
    </div>
    {actions && <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>{actions}</div>}
  </div>
);

export default SectionHeader;
