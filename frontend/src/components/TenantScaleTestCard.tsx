import React, { useRef, useState } from 'react';
import { API_BASE_URL } from '../config';
import { incidentService } from '../api/incidentService';
import { colors, radius } from '../styles/theme';
import { Card } from './ui/Card';

const TENANT_PREFIX = 'scale-test-tenant-';
const MAX_COUNT = 300;
const TIMEOUT_MS = 15_000;

interface SubmitStats {
  total: number;
  success: number;
  rateLimited: number; // 429
  overloaded: number; // 503
  otherFailed: number;
  latencies: number[];
}

interface VerifyResult {
  expected: number;
  found: number;
  missing: string[];
  crossContaminated: string[];
}

function emptySubmitStats(): SubmitStats {
  return { total: 0, success: 0, rateLimited: 0, overloaded: 0, otherFailed: 0, latencies: [] };
}

function percentile(sorted: number[], p: number): number | null {
  if (sorted.length === 0) return null;
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
}

function tenantId(i: number): string {
  return `${TENANT_PREFIX}${String(i).padStart(3, '0')}`;
}

// בדיקת קנה-מידה: מדמה N "משרדים" שונים ששולחים תקרית בו-זמנית, ומוודא
// ששיוך האוטומטי למשרד הנכון עובד נכון בלי "זליגה" בין משרדים - בדיוק
// הבדיקה שבוצעה ידנית פעם אחת, עכשיו ככלי קבוע באתר. בכוונה בלי spoofing
// של IP (כמו בבדיקה הידנית המקורית) - זה ירוץ מהחיבור האמיתי של המפעיל,
// וכל 429/503 שיתקבלו מהגנות-ההצפה הקיימות מדווחים כממצא לגיטימי, לא מוסתרים
export const TenantScaleTestCard: React.FC = () => {
  const [countInput, setCountInput] = useState('');
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState<'submit' | 'verify' | null>(null);
  const [submitStats, setSubmitStats] = useState<SubmitStats>(emptySubmitStats());
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);
  const statsRef = useRef<SubmitStats>(emptySubmitStats());

  const runTest = async () => {
    const n = Math.min(MAX_COUNT, Math.max(1, parseInt(countInput, 10) || 0));
    if (!n) return;

    const confirmed = window.confirm(
      `זה ייצור ${n} תקריות אמיתיות וקבועות במסד הנתונים של הייצור, תחת מזהי-משרד מלאכותיים (${TENANT_PREFIX}001 וכו'). ` +
      `אין דרך למחוק אותן דרך האתר לאחר מכן. להמשיך?`
    );
    if (!confirmed) return;

    statsRef.current = emptySubmitStats();
    setSubmitStats(emptySubmitStats());
    setVerifyResult(null);
    setRunning(true);
    setPhase('submit');

    const uiInterval = setInterval(() => {
      setSubmitStats({ ...statsRef.current, latencies: [...statsRef.current.latencies] });
    }, 300);

    const submitOne = async (i: number) => {
      const tid = tenantId(i);
      const start = performance.now();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
      try {
        const res = await fetch(`${API_BASE_URL}/api/Incidents/ingest`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-Tenant-Id': tid },
          body: JSON.stringify({
            tenantId: tid,
            errorCode: 'SCALE_TEST_ERR',
            errorMessage: `Scale test incident for ${tid}`,
            caseNumber: null,
            externalReferenceId: null,
            clientStationId: null,
            userId: null,
            stackTrace: null,
            rawPayload: null,
          }),
          signal: controller.signal,
        });
        statsRef.current.latencies.push(performance.now() - start);
        if (res.ok) statsRef.current.success++;
        else if (res.status === 429) statsRef.current.rateLimited++;
        else if (res.status === 503) statsRef.current.overloaded++;
        else statsRef.current.otherFailed++;
      } catch {
        statsRef.current.latencies.push(performance.now() - start);
        statsRef.current.otherFailed++;
      } finally {
        clearTimeout(timeoutId);
        statsRef.current.total++;
      }
    };

    await Promise.all(Array.from({ length: n }, (_, idx) => submitOne(idx + 1)));
    clearInterval(uiInterval);
    setSubmitStats({ ...statsRef.current, latencies: [...statsRef.current.latencies] });

    // שלב אימות - מוודאים שכל תקרית שהתקבלה (202) אכן שויכה נכון ל-tenant
    // שלה, בלי "זליגה" בין משרדים
    setPhase('verify');
    const expectedIds = Array.from({ length: n }, (_, idx) => tenantId(idx + 1));
    const foundByTenant = new Map<string, string>(); // tenantId -> errorMessage

    let page = 1;
    let totalCount = Infinity;
    while ((page - 1) * 200 < totalCount && foundByTenant.size < n) {
      const result = await incidentService.getAll(undefined, undefined, page, 200);
      totalCount = result.totalCount;
      for (const item of result.items) {
        if (item.tenantId.startsWith(TENANT_PREFIX) && !foundByTenant.has(item.tenantId)) {
          foundByTenant.set(item.tenantId, item.errorMessage || '');
        }
      }
      page++;
      if (page > 50) break; // בטחון - לא ללולאה אינסופית
    }

    const missing = expectedIds.filter((id) => !foundByTenant.has(id));
    const crossContaminated = expectedIds.filter((id) => {
      const msg = foundByTenant.get(id);
      return msg !== undefined && !msg.includes(id);
    });

    setVerifyResult({ expected: n, found: foundByTenant.size, missing, crossContaminated });
    setRunning(false);
    setPhase(null);
  };

  const sorted = [...submitStats.latencies].sort((a, b) => a - b);
  const avg = sorted.length > 0 ? sorted.reduce((s, v) => s + v, 0) / sorted.length : null;
  const p95 = percentile(sorted, 0.95);
  const successRate = submitStats.total > 0 ? (submitStats.success / submitStats.total) * 100 : null;

  return (
    <Card
      title="בדיקת קנה-מידה - שיוך אוטומטי של תקריות למשרדים"
      action={
        <button
          onClick={runTest}
          disabled={running || !countInput}
          style={{
            padding: '7px 16px',
            background: running || !countInput ? colors.border : 'linear-gradient(135deg, #dc2626, #ea580c)',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: running || !countInput ? 'default' : 'pointer',
            fontWeight: 600,
            fontSize: '12px',
          }}
        >
          {running ? (phase === 'submit' ? 'שולח...' : 'מאמת...') : 'הרץ בדיקה'}
        </button>
      }
    >
      <p style={{ margin: '0 0 10px 0', fontSize: '12px', color: colors.textFaint }}>
        מדמה N "משרדים" שונים ששולחים תקרית בו-זמנית, ומוודא שכל אחת שויכה אוטומטית למשרד הנכון שלה - בלי זליגה בין משרדים.
        רץ מהחיבור האמיתי שלך (בלי זיוף כתובת IP), כך שגם הגנות-הצפה קיימות (הגבלת קצב לפי IP, הגבלת concurrency גלובלית) יתגלו כאן אם הן מופעלות.
      </p>
      <p style={{ margin: '0 0 16px 0', fontSize: '11.5px', color: colors.textFaint }}>
        ⚠ התקריות שנוצרות הן <strong>אמיתיות וקבועות</strong> במסד הנתונים, תחת מזהי-משרד מלאכותיים בתחילית{' '}
        <code style={{ color: colors.accentSoft }}>{TENANT_PREFIX}</code> - אין דרך למחוק אותן דרך האתר.
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        <span style={{ fontSize: '12px', color: colors.textMuted }}>כמה משרדים לדמות:</span>
        <input
          type="number"
          min={1}
          max={MAX_COUNT}
          placeholder="למשל: 100"
          value={countInput}
          onChange={(e) => setCountInput(e.target.value)}
          disabled={running}
          style={{
            width: '90px',
            padding: '6px 10px',
            borderRadius: radius.md,
            border: `1px solid ${colors.border}`,
            backgroundColor: colors.surface,
            color: colors.textPrimary,
            fontSize: '13px',
          }}
        />
        <span style={{ fontSize: '11px', color: colors.textFaint }}>(מקסימום {MAX_COUNT})</span>
      </div>

      {(submitStats.total > 0 || phase) && (
        <>
          <div style={{ fontSize: '11.5px', color: colors.textFaint, marginBottom: '6px', fontWeight: 600 }}>שליחה</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', marginBottom: '16px' }}>
            <StatBox label="סה״כ" value={submitStats.total} />
            <StatBox label="הצליחו" value={submitStats.success} color={colors.successSoft} />
            <StatBox label="הוגבל קצב (429)" value={submitStats.rateLimited} color={submitStats.rateLimited > 0 ? colors.warningSoft : colors.textMuted} />
            <StatBox label="עומס יתר (503)" value={submitStats.overloaded} color={submitStats.overloaded > 0 ? colors.dangerSoft : colors.textMuted} />
            <StatBox label="נכשלו אחרת" value={submitStats.otherFailed} color={submitStats.otherFailed > 0 ? colors.dangerSoft : colors.textMuted} />
            <StatBox label="אחוז הצלחה" value={successRate !== null ? `${successRate.toFixed(0)}%` : '—'} color={successRate !== null && successRate < 70 ? colors.dangerSoft : colors.successSoft} />
            <StatBox label="זמן תגובה ממוצע" value={avg !== null ? `${avg.toFixed(0)}ms` : '—'} />
            <StatBox label="זמן תגובה P95" value={p95 !== null ? `${p95.toFixed(0)}ms` : '—'} />
          </div>
        </>
      )}

      {phase === 'verify' && (
        <p style={{ fontSize: '12px', color: colors.textMuted }}>מאמת שיוך... סורק את רשימת התקריות</p>
      )}

      {verifyResult && (
        <>
          <div style={{ fontSize: '11.5px', color: colors.textFaint, marginBottom: '6px', fontWeight: 600 }}>אימות שיוך</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
            <StatBox label="צפויות" value={verifyResult.expected} />
            <StatBox label="נמצאו ושויכו נכון" value={verifyResult.found} color={verifyResult.found === verifyResult.expected ? colors.successSoft : colors.warningSoft} />
            <StatBox label="חסרות" value={verifyResult.missing.length} color={verifyResult.missing.length > 0 ? colors.warningSoft : colors.textMuted} />
            <StatBox label="זליגה בין משרדים" value={verifyResult.crossContaminated.length} color={verifyResult.crossContaminated.length > 0 ? colors.dangerSoft : colors.successSoft} />
          </div>

          {verifyResult.crossContaminated.length > 0 && (
            <div style={{ marginTop: '14px', padding: '10px 12px', backgroundColor: colors.dangerBg, border: `1px solid ${colors.dangerBorder}`, borderRadius: radius.md, color: colors.dangerSoft, fontSize: '12px', lineHeight: 1.6 }}>
              ⚠ זוהתה זליגה בין משרדים - תקרית שויכה למשרד לא נכון: {verifyResult.crossContaminated.join(', ')}. זהו באג אמיתי בשיוך האוטומטי, לא ממצא תקין.
            </div>
          )}
          {verifyResult.missing.length > 0 && verifyResult.crossContaminated.length === 0 && (
            <div style={{ marginTop: '14px', padding: '10px 12px', backgroundColor: colors.warningBg, border: `1px solid ${colors.warning}`, borderRadius: radius.md, color: colors.warningSoft, fontSize: '12px', lineHeight: 1.6 }}>
              {verifyResult.missing.length} תקריות לא נמצאו עדיין ברשימה - ייתכן שהעיבוד האסינכרוני עדיין לא סיים, נסו לרענן את הבדיקה בעוד כמה שניות.
            </div>
          )}
        </>
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

export default TenantScaleTestCard;
