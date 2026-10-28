import React from 'react';
import { SectionHeader } from '../components/ui/SectionHeader';
import { CapacityFindingsCard } from '../components/CapacityFindingsCard';
import { AzureSqlHealthCard } from '../components/AzureSqlHealthCard';
import { AzureAppServiceHealthCard } from '../components/AzureAppServiceHealthCard';
import { AzureServiceHealthCard } from '../components/AzureServiceHealthCard';
import { LoadTestCard } from '../components/LoadTestCard';
import { TenantScaleTestCard } from '../components/TenantScaleTestCard';

// עמוד עצמאי ונפרד לגמרי מה-NOC - לא על "תקלה שכבר קרתה" אלא על "האם
// התשתית תחזיק מעמד בעומס גבוה". מיועד למנהלים בלבד (מוגן גם ברמת הניווט
// וגם ברמת ה-API בשרת)
export const AzureInfrastructureHealthPage: React.FC = () => (
  <section>
    <SectionHeader
      title="בריאות תשתית Azure"
      subtitle="מדדי קיבולת חיים - לא תקלות שכבר קרו, אלא האם המערכת תחזיק מעמד בעומס גבוה"
    />

    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <AzureServiceHealthCard />
      <CapacityFindingsCard />
      <LoadTestCard />
      <TenantScaleTestCard />
      <AzureAppServiceHealthCard />
      <AzureSqlHealthCard />
    </div>
  </section>
);

export default AzureInfrastructureHealthPage;
