import React from 'react';
import { colors, radius } from '../styles/theme';
import { Card } from './ui/Card';

// סיכום תמציתי של ממצא הקיבולת - בכוונה בלי מספרים קפואים (% הצלחה, זמני
// תגובה), כי אלה משתנים מהרצה להרצה (תלוי בעומס הרגעי על Azure, מצב הרשת
// וכו') - ראו 'בדיקת עומס' למטה למספרים העדכניים בפועל. מה שכן יציב וכדאי
// לתעד כאן זה העובדות שלא משתנות בין הרצות: אילו tiers, ומה המסקנה
const ASSESSED_ON = '07.10.2026';

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div style={{ marginBottom: '14px' }}>
    <div style={{ fontSize: '12px', color: colors.textFaint, fontWeight: 600, marginBottom: '6px' }}>{title}</div>
    <div style={{ fontSize: '13px', color: colors.textSecondary, lineHeight: 1.7 }}>{children}</div>
  </div>
);

export const CapacityFindingsCard: React.FC = () => (
  <Card
    title="הערכת קיבולת - לעתיד, לא דחוף"
    action={
      <span style={{ fontSize: '11px', color: colors.textFaint }}>עודכן לאחרונה: {ASSESSED_ON}</span>
    }
  >
    <div
      style={{
        padding: '12px 14px',
        marginBottom: '16px',
        backgroundColor: colors.surfaceRaised,
        border: `1px solid ${colors.border}`,
        borderRadius: radius.md,
        color: colors.textSecondary,
        fontSize: '13px',
        lineHeight: 1.7,
      }}
    >
      ℹ️ זה כרגע כלי דמו פנימי, לא production עם מאות משתמשים - <strong>אין דחיפות לפעול לפי מה שכתוב כאן</strong>. זה תיעוד לעתיד, אם היקף השימוש יגדל משמעותית.
    </div>

    <Section title="תשתית נוכחית">
      <strong>App Service:</strong> Basic B1 (ליבת CPU אחת, בלי תמיכה ב-autoscale בכלל - מגבלת tier, לא הגדרה).{' '}
      <strong>SQL Database:</strong> Standard S0 (10 DTUs, tier פיתוח/בדיקות).
    </Section>

    <Section title="התנהגות תחת עומס">
      בדיקות עומס חוזרות (100 משתמשים במקביל, גם מול <code>/health</code> שלא נוגע ב-DB בכלל) מראות ירידה עקבית בביצועים - האחוזים המדויקים משתנים מהרצה להרצה, אבל התבנית חוזרת על עצמה בכל פעם, כולל אחרי ימים של מנוחה מלאה. <strong>גם endpoint בלי DB נפגע</strong> - כלומר ה-App Service עצמו (ליבה יחידה) הוא צוואר הבקבוק, לא רק ה-SQL. למספרים העדכניים - ראו "בדיקת עומס" למטה.
    </Section>

    <Section title="מסקנה">
      אין סיבה לשדרג כרגע - אלה ה-tiers הזולים ביותר, ומתאימים לשימוש בפועל. <strong>אם</strong> ויגיע הצורך: צריך לשדרג גם App Service (ל-Standard S1+, מאפשר autoscale) וגם SQL ביחד - שדרוג אחד בלבד ישאיר את השני כצוואר בקבוק.
    </Section>

    <Section title="מוכנות הקוד">
      השדרוג העתידי יהיה רק הגדרות ב-Azure Portal, בלי לגעת בקוד: אימות JWT סטטלס (בלי sticky sessions), connection pool ל-SQL מוגדר בקוד (200, לא תלוי ב-Key Vault), מצבי זיכרון פנימיים כבר thread-safe per-instance, ו-<code>/health</code> כבר מחובר ל-health check האוטומטי של Azure.
    </Section>
  </Card>
);

export default CapacityFindingsCard;
