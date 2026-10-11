import React from 'react';
import { colors, radius, shadow } from '../styles/theme';
import { SectionHeader } from '../components/ui/SectionHeader';

// כתובות ה-production האמיתיות - קבועות כאן (לא נגזרות מ-API_BASE_URL בזמן ריצה)
// כי קישורי SSL Labs צריכים דומיין נקי, בלי protocol/path
const FRONTEND_DOMAIN = 'victorious-coast-0cafbc110.1.azurestaticapps.net';
const BACKEND_DOMAIN = 'bugtracker-api-aharon-fuaucng8a3ckhqck.israelcentral-01.azurewebsites.net';

const sslLabsUrl = (domain: string) => `https://www.ssllabs.com/ssltest/analyze.html?d=${domain}`;

interface SecurityMeasure {
  icon: string;
  title: string;
  description: string;
}

const SECURITY_MEASURES: SecurityMeasure[] = [
  {
    icon: '🏢',
    title: 'בידוד מלא בין לקוחות',
    description: 'כל נתון מסונן אוטומטית לפי הלקוח המחובר ברמת מסד הנתונים עצמו, לא רק בממשק - משרד אחד לא יכול לראות או לשנות נתונים של משרד אחר, גם לא דרך קריאה ישירה ל-API.',
  },
  {
    icon: '🔑',
    title: 'בקרת גישה ברמת הרשומה',
    description: 'משתמש רגיל יכול לערוך או למחוק רק מידע שהוא עצמו דיווח. פעולות מנהל (Admin) דורשות הרשאה מפורשת שנבדקת בשרת בכל בקשה, לא רק מוסתרות בממשק.',
  },
  {
    icon: '🚫',
    title: 'הגנה מפני ניחוש סיסמאות',
    description: 'שתי שכבות עצמאיות: הגבלת קצב לפי כתובת רשת, ונעילת חשבון זמנית אחרי כמה ניסיונות כושלים רצופים - בלי קשר מאיפה הניסיונות מגיעים.',
  },
  {
    icon: '🔒',
    title: 'הצפנת תעבורה מלאה',
    description: 'כל תקשורת מוצפנת ב-HTTPS בלבד, עם מדיניות אבטחה נוספת (Security Headers, HSTS, CSP) שמונעת וקטורי תקיפה נפוצים כמו הטמעת האתר בחלון זר.',
  },
  {
    icon: '🧩',
    title: 'מניעת דליפת מידע משגיאות',
    description: 'שגיאת שרת בלתי צפויה לעולם לא חושפת פרטים פנימיים (מבנה מסד נתונים, נתיבי קבצים) ללקוח - רק לצוות הפיתוח, דרך יומן מאובטח.',
  },
  {
    icon: '🔄',
    title: 'סריקת תלויות אוטומטית',
    description: 'כל ספריות הקוד (צד שרת וצד לקוח) נסרקות באופן שוטף מול מאגרי פגיעויות ידועים, עם עדכון אוטומטי כשמתגלה חולשה חדשה.',
  },
  {
    icon: '🧪',
    title: 'בדיקות אבטחה אוטומטיות',
    description: 'חבילת בדיקות ייעודית רצה אחרי כל שינוי שנוגע בהרשאות או באימות - מוודאת שהגנות קיימות לא נשברות בשינויים עתידיים.',
  },
];

export const SecurityTrustPage: React.FC = () => {
  return (
    <section>
      <SectionHeader
        title="אבטחה ואמון"
        subtitle="סקירה של ההגנות הפעילות במערכת, וכלים חיצוניים ובלתי-תלויים שאפשר להשתמש בהם כדי לאמת אותן בעצמכם"
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: '16px',
          marginBottom: '32px',
        }}
      >
        {SECURITY_MEASURES.map((measure) => (
          <div
            key={measure.title}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              padding: '18px',
              backgroundColor: colors.card,
              border: `1px solid ${colors.border}`,
              borderRadius: radius.lg,
              boxShadow: shadow.card,
            }}
          >
            <span style={{ fontSize: '28px' }}>{measure.icon}</span>
            <div style={{ fontSize: '14px', fontWeight: 700, color: colors.textPrimary }}>
              {measure.title}
            </div>
            <div style={{ fontSize: '12px', color: colors.textMuted, lineHeight: 1.6 }}>
              {measure.description}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          padding: '22px 24px',
          backgroundColor: colors.surfaceRaised,
          border: `1px solid ${colors.border}`,
          borderRadius: radius.lg,
          boxShadow: shadow.card,
        }}
      >
        <div style={{ fontSize: '15px', fontWeight: 700, color: colors.textPrimary, marginBottom: '6px' }}>
          בדקו בעצמכם - לא רק לקחו את המילה שלנו
        </div>
        <p style={{ fontSize: '12.5px', color: colors.textMuted, lineHeight: 1.7, marginBottom: '16px' }}>
          הקישורים הבאים מריצים בדיקה חיצונית ובלתי-תלויה (Qualys SSL Labs, שירות ציבורי ומוכר
          בתעשייה) מול השרתים האמיתיים של המערכת - לא דמו, לא דוח שלנו. התוצאה מוצגת ישירות על
          ידי השירות החיצוני.
        </p>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <a
            href={sslLabsUrl(FRONTEND_DOMAIN)}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: '10px 18px',
              borderRadius: radius.md,
              backgroundColor: colors.accent,
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            בדיקת SSL - שרת האתר ↗
          </a>
          <a
            href={sslLabsUrl(BACKEND_DOMAIN)}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: '10px 18px',
              borderRadius: radius.md,
              backgroundColor: 'transparent',
              color: colors.accentSoft,
              fontSize: '13px',
              fontWeight: 700,
              textDecoration: 'none',
              border: `1px solid ${colors.border}`,
            }}
          >
            בדיקת SSL - שרת ה-API ↗
          </a>
        </div>
      </div>
    </section>
  );
};

export default SecurityTrustPage;
