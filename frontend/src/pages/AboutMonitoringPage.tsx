import React, { useState } from 'react';
import { MONITORING_CAPABILITIES, type MonitoringCapability } from '../data/monitoringCapabilities';
import { colors, radius, shadow } from '../styles/theme';
import { SectionHeader } from '../components/ui/SectionHeader';
import { CapabilityDetailModal } from '../components/CapabilityDetailModal';

// עמוד "מה המערכת יודעת לזהות" - קוביות שאפשר ללחוץ עליהן לפירוט מלא.
// המטרה: תשובה ברורה וגלויה לשאלה "באלו תקלות האתר בכלל מטפל"
export const AboutMonitoringPage: React.FC = () => {
  const [selected, setSelected] = useState<MonitoringCapability | null>(null);

  return (
    <section>
      <SectionHeader
        title="מה המערכת יודעת לזהות"
        subtitle={`${MONITORING_CAPABILITIES.length} סוגי תקלות ומצבים שמנוטרים ומדווחים אוטומטית - לחצו על קוביה לפירוט`}
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: '16px',
        }}
      >
        {MONITORING_CAPABILITIES.map((cap) => (
          <button
            key={cap.id}
            onClick={() => setSelected(cap)}
            style={{
              textAlign: 'right',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              padding: '18px',
              backgroundColor: colors.card,
              border: `1px solid ${colors.border}`,
              borderRadius: radius.lg,
              boxShadow: shadow.card,
              cursor: 'pointer',
              transition: 'transform 0.12s ease, border-color 0.12s ease, background-color 0.12s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.borderColor = colors.accentSoft;
              e.currentTarget.style.backgroundColor = colors.cardHover;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.borderColor = colors.border;
              e.currentTarget.style.backgroundColor = colors.card;
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '28px' }}>{cap.icon}</span>
              {cap.errorCode && (
                <span
                  style={{
                    fontSize: '10px',
                    color: colors.textFaint,
                    fontFamily: 'monospace',
                    background: colors.surface,
                    border: `1px solid ${colors.borderSubtle}`,
                    borderRadius: '4px',
                    padding: '2px 6px',
                  }}
                >
                  {cap.errorCode}
                </span>
              )}
            </div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: colors.textPrimary }}>
              {cap.title}
            </div>
            <div style={{ fontSize: '12px', color: colors.textMuted, lineHeight: 1.6 }}>
              {cap.summary}
            </div>
            <div style={{ fontSize: '11px', color: colors.accentSoft, marginTop: 'auto' }}>
              פרטים נוספים ›
            </div>
          </button>
        ))}
      </div>

      <CapabilityDetailModal capability={selected} onClose={() => setSelected(null)} />
    </section>
  );
};

export default AboutMonitoringPage;
