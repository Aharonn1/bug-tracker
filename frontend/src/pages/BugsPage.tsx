import React from 'react';
import { SectionHeader } from '../components/ui/SectionHeader';
import { BugList } from '../components/BugList';

export const BugsPage: React.FC = () => (
  <section>
    <SectionHeader title="רשימת באגים כלליים" subtitle="מעקב תקלות פיתוח פנימיות" />
    <BugList />
  </section>
);

export default BugsPage;
