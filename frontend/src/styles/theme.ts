// מערכת עיצוב מרכזית - צבעים, מרווחים ורדיוסים משותפים לכל הממשק.
// המטרה: להחליף ערכי hex מפוזרים בקוד בקבוע אחד לכל תפקיד, כדי שהעיצוב
// יהיה עקבי ונוח לשינוי במקום אחד

export const colors = {
  bg: '#0b0f19',
  surface: '#0f172a',
  surfaceRaised: '#131f37',
  card: '#1e293b',
  cardHover: '#243049',
  border: '#334155',
  borderSubtle: '#1e293b',

  textPrimary: '#f8fafc',
  textSecondary: '#cbd5e1',
  textMuted: '#94a3b8',
  textFaint: '#64748b',

  accent: '#2563eb',
  accentHover: '#1d4ed8',
  accentSoft: '#38bdf8',
  violet: '#7c3aed',

  success: '#22c55e',
  successSoft: '#4ade80',
  successBg: '#052e16',

  warning: '#f59e0b',
  warningSoft: '#fbbf24',
  warningBg: '#451a03',

  danger: '#ef4444',
  dangerSoft: '#fca5a5',
  dangerBg: '#450a0a',
  dangerBorder: '#991b1b',

  critical: '#7f1d1d',
  high: '#78350f',
  medium: '#1e3a8a',
  low: '#1e293b',
} as const;

export const severityPalette = {
  critical: { bg: '#7f1d1d', text: '#fca5a5' },
  high: { bg: '#78350f', text: '#fde047' },
  medium: { bg: '#1e3a8a', text: '#93c5fd' },
  low: { bg: '#1e293b', text: '#94a3b8' },
} as const;

export const chartPalette = [
  '#2563eb', '#7c3aed', '#0891b2', '#059669',
  '#d97706', '#dc2626', '#db2777', '#4f46e5',
];

export const radius = {
  sm: '6px',
  md: '8px',
  lg: '12px',
  xl: '16px',
} as const;

export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '20px',
  xxl: '28px',
} as const;

export const shadow = {
  card: '0 1px 2px rgba(0,0,0,0.3)',
  raised: '0 8px 24px rgba(0,0,0,0.35)',
} as const;
