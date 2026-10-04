import React from 'react';
import { SectionHeader } from '../components/ui/SectionHeader';
import { AzureSqlHealthCard } from '../components/AzureSqlHealthCard';
import { AzureAppServiceHealthCard } from '../components/AzureAppServiceHealthCard';
import { LoadTestCard } from '../components/LoadTestCard';
import { colors, radius } from '../styles/theme';

// עמוד עצמאי ונפרד לגמרי מה-NOC - לא על "תקלה שכבר קרתה" אלא על "האם
// התשתית תחזיק מעמד בעומס גבוה". מיועד למנהלים בלבד (מוגן גם ברמת הניווט
// וגם ברמת ה-API בשרת)
export const AzureInfrastructureHealthPage: React.FC = () => (
  <section>
    <SectionHeader
      title="בריאות תשתית Azure"
      subtitle="מדדי קיבולת חיים - לא תקלות שכבר קרו, אלא האם המערכת תחזיק מעמד בעומס גבוה"
    />

    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        padding: '14px 16px',
        marginBottom: '20px',
        backgroundColor: colors.warningBg,
        border: `1px solid ${colors.warning}`,
        borderRadius: radius.md,
      }}
    >
      <span style={{ fontSize: '18px', flexShrink: 0 }}>⚠</span>
      <div style={{ fontSize: '13px', color: colors.warningSoft, lineHeight: 1.7 }}>
        <strong>ידוע מראש:</strong> בסיס הנתונים (BugReportsDb) רץ כרגע על tier <strong>Standard S0 (10 DTUs בלבד)</strong> -
        tier קטן המיועד לעומס פיתוח/בדיקות, לא לייצור בקנה מידה. תחת עומס של מאות/אלפי משתמשים בו-זמנית,
        זה צפוי להיות צוואר הבקבוק הראשון שיישבר - לפני ה-App Service ולפני הקוד שלנו. זה לא מדד חי, אלא עובדה
        שכדאי לזכור כשמסתכלים על הגרפים למטה.
      </div>
    </div>

    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <LoadTestCard />
      <AzureAppServiceHealthCard />
      <AzureSqlHealthCard />
    </div>
  </section>
);

export default AzureInfrastructureHealthPage;
