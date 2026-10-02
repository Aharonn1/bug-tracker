import React from 'react';
import type { SystemIncident } from '../types/bug.types';
import { SectionHeader } from '../components/ui/SectionHeader';
import { UnhandledErrorsPanel } from '../components/UnhandledErrorsPanel';

interface TriagePageProps {
  incidents: SystemIncident[];
}

// עמוד עצמאי לתור הטריאז' - מופרד מה-NOC הראשי כדי שלא תצטרכו לגלול
// דרך כל הגרפים והמדדים רק כדי להגיע לרשימת השגיאות שעוד לא טופלו
export const TriagePage: React.FC<TriagePageProps> = ({ incidents }) => (
  <section>
    <SectionHeader
      title="תור טריאז' - שגיאות שטרם טופלו"
      subtitle="בדיקה מהירה עם AI לכל שגיאה פתוחה, לפני שפותחים בה טיפול"
    />
    <UnhandledErrorsPanel incidents={incidents} />
  </section>
);

export default TriagePage;
