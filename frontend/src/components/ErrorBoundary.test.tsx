import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ErrorBoundary } from './ErrorBoundary';

vi.mock('../api/incidentService', () => ({
  incidentService: {
    create: vi.fn().mockResolvedValue({ message: 'queued' }),
  },
}));

function ThrowingComponent(): never {
  throw new Error('בדיקת קריסה מכוונת');
}

describe('ErrorBoundary', () => {
  it('renders children normally when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>תוכן תקין</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('תוכן תקין')).toBeInTheDocument();
  });

  it('renders a friendly fallback screen instead of a blank page when a child crashes', () => {
    // React מדפיס אזהרת console.error לקריסות שנתפסות ב-Error Boundary - זה צפוי, לא כשל אמיתי
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('משהו השתבש בעמוד')).toBeInTheDocument();
    expect(screen.getByText('רענן את הדף')).toBeInTheDocument();

    consoleErrorSpy.mockRestore();
  });
});
