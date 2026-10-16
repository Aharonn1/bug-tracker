import React, { useEffect, useState } from 'react';
import { failedIncidentService } from '../api/failedIncidentService';
import type { FailedIncidentSummary } from '../types/failedIncident.types';
import { colors, radius, spacing } from '../styles/theme';
import { SectionHeader } from '../components/ui/SectionHeader';

export const FailedIncidentsPage: React.FC = () => {
  const [items, setItems] = useState<FailedIncidentSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [retryingId, setRetryingId] = useState<number | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setItems(await failedIncidentService.getUnresolved());
      setError(null);
    } catch (err: any) {
      setError(err.message || 'כשל בטעינת תור התקריות שנכשלו');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleRetry = async (id: number) => {
    setRetryingId(id);
    try {
      const result = await failedIncidentService.retryNow(id);
      if (result.succeeded) {
        // הצליח - מוסרים מהרשימה המקומית בלי לחכות ל-fetch מלא נוסף
        setItems((cur) => cur?.filter((item) => item.id !== id) ?? cur);
      } else {
        // נכשל שוב - מרעננים את כל הרשימה כדי לקבל את מונה-הניסיונות המעודכן
        await load();
      }
    } catch (err: any) {
      setError(err.message || 'כשל בניסיון חוזר');
    } finally {
      setRetryingId(null);
    }
  };

  if (loading) {
    return (
      <section>
        <SectionHeader title="תקריות שנכשלו" subtitle="תקריות שנכשלו בעיבוד הראשוני ולא נשמרו - תור Dead-Letter" />
        <p style={{ color: colors.textMuted, fontSize: '13px' }}>טוען...</p>
      </section>
    );
  }

  if (error || !items) {
    return (
      <section>
        <SectionHeader title="תקריות שנכשלו" subtitle="תקריות שנכשלו בעיבוד הראשוני ולא נשמרו - תור Dead-Letter" />
        <div style={{ padding: spacing.lg, backgroundColor: colors.dangerBg, border: `1px solid ${colors.dangerBorder}`, borderRadius: radius.md, color: colors.dangerSoft, fontSize: '13px' }}>
          {error ?? 'שגיאה לא צפויה'}
          {error?.includes('403') && ' - עמוד זה זמין רק למנהל-העל (SiteAdmin).'}
        </div>
      </section>
    );
  }

  return (
    <section>
      <SectionHeader
        title="תקריות שנכשלו"
        subtitle={
          items.length === 0
            ? 'אין תקריות תקועות כרגע - תור ה-Dead-Letter ריק'
            : `${items.length} תקריות לא נפתרו - המערכת מנסה אוטומטית כל 2 דקות, או שלחצו "נסה שוב" ידנית`
        }
      />

      {items.length === 0 ? (
        <p style={{ color: colors.textFaint, fontSize: '13px' }}>👍 כל התקריות שהתקבלו עובדו בהצלחה.</p>
      ) : (
        <div style={{ overflowX: 'auto', background: colors.surface, borderRadius: radius.lg, border: `1px solid ${colors.borderSubtle}` }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', color: colors.textSecondary, fontSize: '12.5px' }}>
            <thead>
              <tr style={{ background: colors.card, borderBottom: `1px solid ${colors.border}` }}>
                <th style={{ padding: '10px 12px' }}>לקוח</th>
                <th style={{ padding: '10px 12px' }}>קוד שגיאה</th>
                <th style={{ padding: '10px 12px' }}>שגיאת הניסיון האחרון</th>
                <th style={{ padding: '10px 12px' }}>נכשל לראשונה</th>
                <th style={{ padding: '10px 12px' }}>ניסיון אחרון</th>
                <th style={{ padding: '10px 12px', textAlign: 'center' }}>ניסיונות</th>
                <th style={{ padding: '10px 12px', textAlign: 'center' }}>פעולה</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr
                  key={item.id}
                  style={{
                    borderBottom: `1px solid ${colors.borderSubtle}`,
                    backgroundColor: idx % 2 === 1 ? colors.surfaceRaised : 'transparent',
                  }}
                >
                  <td style={{ padding: '10px 12px', whiteSpace: 'nowrap', color: colors.accentSoft, fontWeight: 600 }}>
                    {item.tenantId}
                  </td>
                  <td style={{ padding: '10px 12px', fontWeight: 600, color: colors.textPrimary, whiteSpace: 'nowrap' }}>
                    {item.errorCode}
                  </td>
                  <td style={{ padding: '10px 12px', color: colors.dangerSoft, maxWidth: '360px' }}>
                    {item.errorMessage}
                  </td>
                  <td style={{ padding: '10px 12px', whiteSpace: 'nowrap', fontSize: '11.5px', color: colors.textFaint }}>
                    {new Date(item.firstFailedAt).toLocaleString('he-IL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td style={{ padding: '10px 12px', whiteSpace: 'nowrap', fontSize: '11.5px', color: colors.textFaint }}>
                    {new Date(item.lastAttemptAt).toLocaleString('he-IL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
                    {item.attemptCount}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                    <button
                      onClick={() => handleRetry(item.id)}
                      disabled={retryingId === item.id}
                      style={{
                        padding: '6px 14px',
                        borderRadius: radius.md,
                        border: 'none',
                        backgroundColor: colors.accent,
                        color: '#fff',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: retryingId === item.id ? 'default' : 'pointer',
                        opacity: retryingId === item.id ? 0.6 : 1,
                      }}
                    >
                      {retryingId === item.id ? 'מנסה...' : 'נסה שוב'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

export default FailedIncidentsPage;
