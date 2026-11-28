import React, { useRef, useState } from 'react';
import { API_BASE_URL, tenantHeaders } from '../config';
import { colors, radius } from '../styles/theme';
import { Card } from './ui/Card';
import { InfoButton } from './ui/InfoButton';
import { MetricInfoModal, type MetricExplain } from './ui/MetricInfoModal';

const LOAD_TEST_EXPLAIN: MetricExplain = {
  source: 'backend',
  body: [
    'הלולאה עצמה רצה בדפדפן שלך, לא בשרת: 100 "משתמשים" וירטואליים, כל אחד בלולאה נפרדת ששולחת בקשת GET אמיתית (עם הטוקן המחובר שלך), מחכה לתשובה (או ל-timeout של 8 שניות), ומיד שולחת את הבאה - שוב ושוב, במשך כל 30 השניות. "סה״כ בקשות" הוא הסכום של כל הבקשות האלה מכל 100 הלולאות יחד, לא 100 בדיוק.',
    'שתי הבדיקות עוברות קודם באותו צינור בדיוק ב-App Service: HTTPS, CORS, ואותו Rate Limiter גלובלי (מגביל כמות בקשות-מקבילות לכל האתר; מעבר למכסה נכנסות לתור קצר, ומעבר לתור מקבלות 503) - זהה לשתי הבדיקות, אז הוא לא ה"הבדל" ביניהן.',
    '/health ("בלי DB") הוא endpoint מובנה של ASP.NET Core, בלי אימות Token - אבל לא "בלי DB" לגמרי: הוא כן פותח חיבור אמיתי ל-Azure SQL כדי לוודא שהוא זמין (CanConnectAsync), רק בלי להריץ שאילתה עסקית אמיתית על טבלת התקריות.',
    '/api/Incidents ("עם DB") עובר קודם אימות Token מלא + זיהוי הלקוח (Tenant), ואז מריץ בפועל 2-3 שאילתות נפרדות מול SQL לכל בקשה בודדת: ספירת סה"כ תקריות, שליפת העמוד הנוכחי עם join לדיווחים ולפרטים, ושליפת היסטוריית דיפלויים - כולן קריאה-בלבד, אבל עם joins, לא שאילתה בודדת וקלה.',
    'בדיוק בגלל זה כדאי להריץ את שתיהן ולהשוות: אם גם /health (שלא נוגע בעסק בכלל) נכשל תחת עומס, הבעיה היא ב-App Service עצמו (ליבת CPU יחידה, בלי autoscale) - לא רק ב-SQL. אם רק /api/Incidents נכשל, זה מצביע יותר על התקרה הנמוכה של ה-SQL (Standard S0, 10 DTU).',
  ],
  qa: [
    { q: 'האם /health זו בדיקה שלא נוגעת ב-DB בכלל?', a: 'כמעט - היא כן פותחת חיבור אמיתי ל-Azure SQL כדי לבדוק שהוא זמין, רק בלי להריץ שאילתה עסקית אמיתית על טבלת התקריות.' },
    { q: 'האם שתי הבדיקות מוגבלות באותו Rate Limiter?', a: 'כן, בדיוק אותו - המגבלה הגלובלית על כמות בקשות מקבילות לכל האתר זהה לשתי הבדיקות, אז היא לא ההבדל ביניהן.' },
    { q: 'למה בכלל להריץ שתי בדיקות נפרדות ולא רק אחת?', a: 'כדי לבודד את מקור הבעיה: אם גם /health נכשל, זו בעיה ב-App Service עצמו; אם רק /api/Incidents נכשל, זו בעיה ב-SQL.' },
  ],
};

const CONCURRENCY = 100;
const DURATION_MS = 30_000;
const TIMEOUT_MS = 8_000;

// שני יעדים לבידוד הבעיה: /api/Incidents נוגע ב-DB, /health לא נוגע בכלל
// (endpoint קליל, בלי אימות, בלי שאילתה) - אם גם הוא נכשל תחת עומס, הבעיה
// היא ב-App Service עצמו ולא רק ב-SQL
const TARGETS = {
  withDb: { label: 'עם DB (/api/Incidents)', path: '/api/Incidents' },
  withoutDb: { label: 'בלי DB (/health)', path: '/health' },
} as const;

type TargetKey = keyof typeof TARGETS;

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
  const [target, setTarget] = useState<TargetKey>('withDb');
  const [lastTarget, setLastTarget] = useState<TargetKey | null>(null);
  const [running, setRunning] = useState(false);
  const [stats, setStats] = useState<Stats>(emptyStats());
  const [finished, setFinished] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const statsRef = useRef<Stats>(emptyStats());

  const runTest = async () => {
    const confirmed = window.confirm(
      `זה ישלח ${CONCURRENCY} בקשות במקביל ל-${TARGETS[target].label} בשרת הייצור, למשך ${DURATION_MS / 1000} שניות, ועלול להאט את האתר זמנית לכל מי שמשתמש בו עכשיו. להמשיך?`
    );
    if (!confirmed) return;

    const targetUrl = `${API_BASE_URL}${TARGETS[target].path}`;

    statsRef.current = emptyStats();
    setStats(emptyStats());
    setFinished(false);
    setLastTarget(target);
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
          const res = await fetch(targetUrl, { headers: tenantHeaders({ Accept: 'application/json' }), signal: controller.signal });
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <InfoButton onClick={() => setInfoOpen(true)} />
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
        </div>
      }
    >
      <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: colors.textFaint }}>
        שולח {CONCURRENCY} בקשות GET במקביל (קריאה בלבד, בלי כתיבה ל-DB) דרך הדפדפן שלך עצמו, במשך {DURATION_MS / 1000} שניות - כדי לראות בפועל מה קורה לזמני התגובה תחת עומס. בקשה שלא ענתה תוך {TIMEOUT_MS / 1000} שניות נספרת כ"נכשלה" (גם אם היא הייתה עונה בסוף) - כי משתמש אמיתי לא מחכה ככה.
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        <span style={{ fontSize: '12px', color: colors.textMuted }}>יעד הבדיקה:</span>
        {(Object.keys(TARGETS) as TargetKey[]).map((key) => (
          <button
            key={key}
            onClick={() => setTarget(key)}
            disabled={running}
            style={{
              padding: '5px 12px',
              borderRadius: '999px',
              border: `1px solid ${target === key ? colors.accentSoft : colors.border}`,
              backgroundColor: target === key ? colors.surfaceRaised : 'transparent',
              color: target === key ? colors.textPrimary : colors.textMuted,
              fontSize: '12px',
              fontWeight: target === key ? 700 : 400,
              cursor: running ? 'default' : 'pointer',
            }}
          >
            {TARGETS[key].label}
          </button>
        ))}
      </div>

      {(running || finished) && (
        <div style={{ fontSize: '12px', color: colors.textFaint, marginBottom: '8px' }}>
          תוצאות עבור: <strong style={{ color: colors.textSecondary }}>{lastTarget ? TARGETS[lastTarget].label : ''}</strong>
        </div>
      )}

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
          ⚠ רוב הבקשות נכשלו תחת העומס הזה.{' '}
          {lastTarget === 'withoutDb'
            ? 'זה היה מול /health, שלא נוגע ב-DB בכלל - כלומר הבעיה היא ב-App Service עצמו (CPU/thread pool), לא רק ב-SQL. גם שדרוג ה-SQL לבדו לא יפתור את זה.'
            : 'זה היה מול /api/Incidents, שכן נוגע ב-DB. כדי לדעת אם זה ה-SQL או ה-App Service עצמו - הריצו את אותה בדיקה מול /health (בחירת היעד למעלה) ותשוו.'}
        </div>
      )}

      {infoOpen && (
        <MetricInfoModal
          title="בדיקת עומס - מה קורה בענן בכל בקשה"
          source={LOAD_TEST_EXPLAIN.source}
          body={LOAD_TEST_EXPLAIN.body}
          qa={LOAD_TEST_EXPLAIN.qa}
          onClose={() => setInfoOpen(false)}
        />
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
