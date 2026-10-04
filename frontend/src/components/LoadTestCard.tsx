import React, { useRef, useState } from 'react';
import { API_BASE_URL, tenantHeaders } from '../config';
import { colors, radius } from '../styles/theme';
import { Card } from './ui/Card';

const CONCURRENCY = 100;
const DURATION_MS = 30_000;
const TIMEOUT_MS = 8_000;
const TARGET_URL = `${API_BASE_URL}/api/Incidents`;

interface Stats {
  total: number;
  success: number;
  failed: number;
  timedOut: number;
  latencies: number[];
}

function emptyStats(): Stats {
  return { total: 0, success: 0, failed: 0, timedOut: 0, latencies: [] };
}

function percentile(sorted: number[], p: number): number | null {
  if (sorted.length === 0) return null;
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
}

// כפתור בדיקת עומס - מדמה N "משתמשים" במקביל שקוראים שוב ושוב GET
// /api/Incidents (קריאה בלבד, שום כתיבה ל-DB) מתוך הדפדפן של מי שלוחץ,
// באמצעות הטוקן המחובר שלו עצמו. התוצאות מוצגות באתר במקום רק בטרמינל -
// כדי שאפשר יהיה לראות בעין מה קורה לזמני התגובה תחת עומס אמיתי
export const LoadTestCard: React.FC = () => {
  const [running, setRunning] = useState(false);
  const [stats, setStats] = useState<Stats>(emptyStats());
  const [finished, setFinished] = useState(false);
  const statsRef = useRef<Stats>(emptyStats());

  const runTest = async () => {
    const confirmed = window.confirm(
      `זה ישלח ${CONCURRENCY} בקשות במקביל לשרת הייצור למשך ${DURATION_MS / 1000} שניות, ועלול להאט את האתר זמנית לכל מי שמשתמש בו עכשיו. להמשיך?`
    );
    if (!confirmed) return;

    statsRef.current = emptyStats();
    setStats(emptyStats());
    setFinished(false);
    setRunning(true);

    const uiInterval = setInterval(() => {
      setStats({ ...statsRef.current, latencies: [...statsRef.current.latencies] });
    }, 500);

    const deadline = Date.now() + DURATION_MS;

    const worker = async () => {
      while (Date.now() < deadline) {
        const start = performance.now();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
        try {
          const res = await fetch(TARGET_URL, { headers: tenantHeaders({ Accept: 'application/json' }), signal: controller.signal });
          const elapsed = performance.now() - start;
          statsRef.current.latencies.push(elapsed);
          if (res.ok) statsRef.current.success++; else statsRef.current.failed++;
        } catch (err: any) {
          statsRef.current.latencies.push(performance.now() - start);
          statsRef.current.failed++;
          if (err?.name === 'AbortError') statsRef.current.timedOut++;
        } finally {
          clearTimeout(timeoutId);
        }
        statsRef.current.total++;
      }
    };

    await Promise.all(Array.from({ length: CONCURRENCY }, worker));

    clearInterval(uiInterval);
    setStats({ ...statsRef.current, latencies: [...statsRef.current.latencies] });
    setRunning(false);
    setFinished(true);
  };

  const sorted = [...stats.latencies].sort((a, b) => a - b);
  const avg = sorted.length > 0 ? sorted.reduce((s, v) => s + v, 0) / sorted.length : null;
  const p95 = percentile(sorted, 0.95);
  const successRate = stats.total > 0 ? (stats.success / stats.total) * 100 : null;

  return (
    <Card
      title="בדיקת עומס - סימולציית משתמשים במקביל"
      action={
        <button
          onClick={runTest}
          disabled={running}
          style={{
            padding: '7px 16px',
            background: running ? colors.border : 'linear-gradient(135deg, #dc2626, #ea580c)',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: running ? 'default' : 'pointer',
            fontWeight: 600,
            fontSize: '12px',
          }}
        >
          {running ? 'רץ כרגע...' : `הרץ בדיקה (${CONCURRENCY} משתמשים, ${DURATION_MS / 1000}ש׳)`}
        </button>
      }
    >
      <p style={{ margin: '0 0 14px 0', fontSize: '12px', color: colors.textFaint }}>
        שולח {CONCURRENCY} בקשות GET במקביל (קריאה בלבד, בלי כתיבה ל-DB) דרך הדפדפן שלך עצמו, במשך {DURATION_MS / 1000} שניות - כדי לראות בפועל מה קורה לזמני התגובה תחת עומס. בקשה שלא ענתה תוך {TIMEOUT_MS / 1000} שניות נספרת כ"נכשלה" (גם אם היא הייתה עונה בסוף) - כי משתמש אמיתי לא מחכה ככה.
      </p>

      {(running || finished) && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
          <StatBox label="סה״כ בקשות" value={stats.total} />
          <StatBox label="הצליחו" value={stats.success} color={colors.successSoft} />
          <StatBox
            label="נכשלו"
            value={stats.timedOut > 0 ? `${stats.failed} (מתוכן ${stats.timedOut} timeout)` : stats.failed}
            color={stats.failed > 0 ? colors.dangerSoft : colors.textMuted}
          />
          <StatBox
            label="אחוז הצלחה"
            value={successRate !== null ? `${successRate.toFixed(0)}%` : '—'}
            color={successRate !== null && successRate < 70 ? colors.dangerSoft : colors.successSoft}
          />
          <StatBox label="זמן תגובה ממוצע" value={avg !== null ? `${avg.toFixed(0)}ms` : '—'} />
          <StatBox label="זמן תגובה P95" value={p95 !== null ? `${p95.toFixed(0)}ms` : '—'} />
        </div>
      )}

      {finished && successRate !== null && successRate < 70 && (
        <div
          style={{
            marginTop: '14px',
            padding: '10px 12px',
            backgroundColor: colors.dangerBg,
            border: `1px solid ${colors.dangerBorder}`,
            borderRadius: radius.md,
            color: colors.dangerSoft,
            fontSize: '12px',
            lineHeight: 1.6,
          }}
        >
          ⚠ רוב הבקשות נכשלו תחת העומס הזה - סימן ברור שהתשתית הנוכחית (SQL S0 ו/או App Service) לא עומדת במשתמשים בו-זמנית בכמות הזו.
        </div>
      )}
    </Card>
  );
};

const StatBox: React.FC<{ label: string; value: React.ReactNode; color?: string }> = ({ label, value, color }) => (
  <div style={{ padding: '10px 12px', backgroundColor: colors.surface, border: `1px solid ${colors.borderSubtle}`, borderRadius: radius.md }}>
    <div style={{ fontSize: '11px', color: colors.textFaint, marginBottom: '4px' }}>{label}</div>
    <div style={{ fontSize: '18px', fontWeight: 700, color: color ?? colors.textPrimary, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
  </div>
);

export default LoadTestCard;
