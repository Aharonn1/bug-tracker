import React from 'react';
import { colors, radius } from '../styles/theme';
import { Card } from './ui/Card';

// סיכום סטטי של בדיקת הקיבולת שבוצעה - לא מדד חי, אלא תיעוד של ממצא אמיתי
// שהתגלה דרך סדרת בדיקות עומס חוזרות (כולל בדיקה אחרי יומיים מנוחה מלאה,
// כדי לשלול שזו הייתה תשישות זמנית ולא מגבלה מבנית). מתעדכן ידנית אם
// התשתית בפועל משתנה (שדרוג tier וכו')
const ASSESSED_ON = '06.10.2026';

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div style={{ marginBottom: '16px' }}>
    <div style={{ fontSize: '12px', color: colors.textFaint, fontWeight: 600, marginBottom: '6px' }}>{title}</div>
    <div style={{ fontSize: '13px', color: colors.textSecondary, lineHeight: 1.8 }}>{children}</div>
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
        marginBottom: '18px',
        backgroundColor: colors.surfaceRaised,
        border: `1px solid ${colors.border}`,
        borderRadius: radius.md,
        color: colors.textSecondary,
        fontSize: '13px',
        lineHeight: 1.7,
      }}
    >
      ℹ️ <strong>זה כרגע כלי דמו פנימי</strong>, לא מערכת production עם מאות משתמשים בו-זמנית - אין שום דחיפות לפעול לפי מה שכתוב כאן. הממצאים למטה מתועדים לעתיד: אם היקף השימוש האמיתי יגדל משמעותית, יש כבר תשובה מוכנה ל"האם המערכת תחזיק מעמד ומה צריך לשדרג".
    </div>

    <Section title="התשתית הנוכחית">
      <ul style={{ margin: 0, paddingRight: '20px' }}>
        <li>
          <strong>App Service (הבקאנד):</strong> tier <strong>Basic B1</strong> - ליבת CPU אחת (vCPU), 1.75GB זיכרון.
          Basic tier <strong>לא תומך ב-autoscale בכלל</strong> - זו מגבלה מובנית של ה-tier, לא הגדרה שאפשר להדליק.
        </li>
        <li style={{ marginTop: '6px' }}>
          <strong>SQL Database (BugReportsDb):</strong> tier <strong>Standard S0</strong> - 10 DTUs בלבד, מיועד לפיתוח/בדיקות.
        </li>
      </ul>
    </Section>

    <Section title="מה נבדק">
      סימולציית 100 "משתמשים" במקביל, שולחים בקשות GET שוב ושוב במשך 30 שניות - פעם מול <code>/api/Incidents</code> (נוגע ב-DB) ופעם מול <code>/health</code> (לא נוגע ב-DB בכלל, לא דורש אימות). בקשה שלא נענתה תוך 8 שניות נספרה ככישלון. הבדיקה בוצעה מספר פעמים, כולל פעם אחת אחרי יומיים מלאים ללא שום תנועה לשרת.
    </Section>

    <Section title="מה נמצא">
      <ul style={{ margin: 0, paddingRight: '20px' }}>
        <li>תחת 100 משתמשים במקביל: <strong>כ-20%-30% אחוז הצלחה בלבד</strong>, זמן תגובה ממוצע 6-8 שניות.</li>
        <li>
          <strong>גם <code>/health</code>, שלא נוגע ב-DB בכלל, נכשל באותה מידה בערך</strong> - מה שמוכיח שהבעיה היא לא רק ה-SQL. ה-App Service עצמו (ליבת CPU יחידה) כבר מהווה צוואר בקבוק, עוד לפני שמגיעים ל-DB.
        </li>
        <li>הממצא חזר על עצמו <strong>באופן זהה אחרי יומיים מנוחה</strong> - זו מגבלת קיבולת מבנית וקבועה, לא תשישות זמנית שמתאוששת לבד.
        </li>
      </ul>
    </Section>

    <Section title="מסקנה - אם ואז יגיע הצורך">
      ה-tiers הנוכחיים (B1 ו-S0) הם גם הזולים ביותר ב-Azure, והם לגמרי מתאימים לשימוש בפועל של כמה משתמשים בודדים. <strong>אין סיבה לשדרג אותם כרגע</strong> - זו תהיה הוצאה חודשית נוספת על קיבולת שאף אחד לא ינצל. רק אם היקף השימוש האמיתי יגדל משמעותית: שדרוג ה-SQL בלבד לא יספיק (ליבת CPU אחת ב-App Service היא צוואר הבקבוק הראשון, עוד לפני ה-DB) - יהיה צריך לשדרג <strong>גם</strong> את ה-App Service (ל-Standard S1 לפחות, שגם מאפשר autoscale) <strong>וגם</strong> את ה-SQL, ביחד.
    </Section>

    <Section title="מוכנות הקוד - כבר עכשיו, לא כשיגיע הצורך">
      הקוד עצמו בנוי כך שהשדרוג העתידי (אם וכש) יהיה <strong>רק שינויי הגדרות ב-Azure Portal</strong>, בלי לגעת בקוד:
      <ul style={{ margin: '8px 0 0 0', paddingRight: '20px' }}>
        <li>האימות מבוסס JWT סטטלס (לא session/cookies בצד שרת) - כל instance יכול לטפל בכל בקשה, אין צורך ב-sticky sessions כש-autoscale יוסיף instances.</li>
        <li>ה-connection pool ל-SQL מוגדר במפורש בקוד (200, לא ברירת המחדל של 100) - לא תלוי במה שמוגדר ב-connection string ב-Key Vault, כך ששדרוג tier ל-SQL ינוצל במלואו מיד, בלי תקרה נסתרת בצד הלקוח.</li>
        <li>מצבי זיכרון פנימיים (כמו תור תקלות הזמינות) כבר thread-safe ועצמאיים per-instance - לא ישברו כש-autoscale ירים עוד instance.</li>
        <li><code>/health</code> כבר קיים ומחובר ל-health check האוטומטי של Azure - נדרש כבר היום בשביל scale-out אמיתי.</li>
      </ul>
    </Section>
  </Card>
);

export default CapacityFindingsCard;
