import React from 'react';
import { colors } from '../styles/theme';
import BugForm from '../components/BugForm';

interface NewBugPageProps {
  onBugCreated: () => void;
}

export const NewBugPage: React.FC<NewBugPageProps> = ({ onBugCreated }) => (
  <section style={{ maxWidth: '640px', margin: '0 auto' }}>
    <div style={{ marginBottom: '20px', textAlign: 'center' }}>
      <h2 style={{ margin: 0, fontSize: '20px', color: colors.textPrimary, fontWeight: 700 }}>דיווח באג חדש</h2>
      <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: colors.textMuted }}>פתיחת קריאת שירות לשכבת הליבה</p>
    </div>
    <BugForm onBugCreated={onBugCreated} />
  </section>
);

export default NewBugPage;
