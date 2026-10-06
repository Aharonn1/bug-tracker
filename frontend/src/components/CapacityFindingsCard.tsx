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
    title="הערכת קיבולת - מצב נוכחי"
    action={
      <span style={{ fontSize: '11px', color: colors.textFaint }}>עודכן לאחרונה: {ASSESSED_ON}</span>
    }
  >
    <div
      style={{
        padding: '12px 14px',
        marginBottom: '18px',
        backgroundColor: colors.dangerBg,
        border: `1px solid ${colors.dangerBorder}`,
        borderRadius: radius.md,
        color: colors.dangerSoft,
        fontSize: '13px',
        fontWeight: 600,
        lineHeight: 1.7,
      }}
    >
      ⚠ המערכת כפי שהיא מוגדרת היום לא מחזיקה מעמד תחת כ-100 משתמשים בו-זמנית. זו לא תקלה חד-פעמית - הממצא חזר על עצמו בעקביות, כולל בבדיקה שבוצעה אחרי יומיים שבהם השרת לא קיבל שום תנועה.
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

    <Section title="מסקנה והמלצה">
      שדרוג ה-SQL בלבד <strong>לא יספיק</strong> - ליבת CPU אחת לא יכולה לשרת 100 בקשות בו-זמנית בצורה סבירה, לא משנה כמה ה-DB מהיר. כדי שהמערכת תחזיק עומס אמיתי, צריך לשדרג <strong>גם</strong> את ה-App Service (ל-Standard S1 לפחות - מאפשר autoscale אמיתי) <strong>וגם</strong> את ה-SQL, ביחד. אחד בלי השני ישאיר את הצוואר בקבוק השני במקומו.
    </Section>
  </Card>
);

export default CapacityFindingsCard;
