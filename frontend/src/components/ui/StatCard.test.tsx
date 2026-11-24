import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatCard } from './StatCard';

describe('StatCard', () => {
  it('renders label and value without an info button when no explain is given', () => {
    render(<StatCard label="אירועים פתוחים" value={47} />);

    expect(screen.getByText('אירועים פתוחים')).toBeInTheDocument();
    expect(screen.getByText('47')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('opens and closes the behind-the-scenes modal when an explain prop is given', () => {
    render(
      <StatCard
        label="אירועים פתוחים"
        value={47}
        explain={{ source: 'code', body: ['נספר בדפדפן מתוך העמוד הנוכחי.'] }}
      />
    );

    expect(screen.queryByText('נספר בדפדפן מתוך העמוד הנוכחי.')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'מה עומד מאחורי המספר הזה' }));

    expect(screen.getByText('נספר בדפדפן מתוך העמוד הנוכחי.')).toBeInTheDocument();
    expect(screen.getByText('💻 מחושב בקוד (בדפדפן/בשרת שלנו)')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'סגור' }));

    expect(screen.queryByText('נספר בדפדפן מתוך העמוד הנוכחי.')).not.toBeInTheDocument();
  });
});
