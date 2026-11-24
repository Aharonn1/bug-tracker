import React, { useState } from 'react';
import { colors, radius, shadow } from '../styles/theme';
import { SectionHeader } from '../components/ui/SectionHeader';
import { InfoButton } from '../components/ui/InfoButton';
import { MetricInfoModal, type MetricExplain } from '../components/ui/MetricInfoModal';

// כתובות ה-production האמיתיות - קבועות כאן (לא נגזרות מ-API_BASE_URL בזמן ריצה)
// כי קישורי SSL Labs צריכים דומיין נקי, בלי protocol/path
const FRONTEND_DOMAIN = 'victorious-coast-0cafbc110.1.azurestaticapps.net';
const BACKEND_DOMAIN = 'bugtracker-api-aharon-fuaucng8a3ckhqck.israelcentral-01.azurewebsites.net';

const sslLabsUrl = (domain: string) => `https://www.ssllabs.com/ssltest/analyze.html?d=${domain}`;
const observatoryUrl = (domain: string) => `https://observatory.mozilla.org/analyze/${domain}`;
const securityHeadersUrl = (domain: string) => `https://securityheaders.com/?q=https%3A%2F%2F${domain}&followRedirects=on`;

// ל-CSP Evaluator אין פרמטר URL להזנה אוטומטית של דומיין - הכלי דורש הדבקה
// ידנית של מדיניות ה-CSP עצמה, אז במקום כפתור לכל דומיין מציגים את שתי
// המדיניות (אתר + API) כטקסט להעתקה, לצד קישור יחיד לכלי
const CSP_EVALUATOR_URL = 'https://csp-evaluator.withgoogle.com/';

// שני אלה הם עותק-טקסט לתצוגה, לא המדיניות האוכפת בפועל - אין API סטנדרטי
// שמאפשר לדף לקרוא את ה-CSP header שהוא עצמו הוגש איתו, אז זה לא נגזר
// אוטומטית. אם המדיניות האמיתית משתנה בלי לעדכן כאן, הדף הזה - שכל מטרתו
// להציג מדיניות אבטחה אמינה - יציג משהו שגוי. מקור האמת לכל אחד:
// FRONTEND_CSP: frontend/public/staticwebapp.config.json -> globalHeaders
// BACKEND_CSP:  backend/Program.cs, ליד "X-Frame-Options" (אותו בלוק)
const FRONTEND_CSP =
  "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self'; font-src 'self'; connect-src 'self' https://bugtracker-api-aharon-fuaucng8a3ckhqck.israelcentral-01.azurewebsites.net https://www.gstatic.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'";
const BACKEND_CSP = "default-src 'none'; frame-ancestors 'none'";

interface VerificationTool {
  label: string;
  description: string;
  urlBuilder: (domain: string) => string;
}

const VERIFICATION_TOOLS: VerificationTool[] = [
  {
    label: 'Qualys SSL Labs',
    description: 'בודק את עוצמת ההצפנה והתעודה הדיגיטלית של החיבור',
    urlBuilder: sslLabsUrl,
  },
  {
    label: 'Mozilla Observatory',
    description: 'בודק את כל ה-Security Headers שהשרת שולח, נותן ציון A-F',
    urlBuilder: observatoryUrl,
  },
  {
    label: 'SecurityHeaders.com',
    description: 'בדיקה ממוקדת וממשק מהיר, מתמקד אך ורק ב-Security Headers',
    urlBuilder: securityHeadersUrl,
  },
];

interface SecurityMeasure {
  icon: string;
  title: string;
  description: string;
  explain: MetricExplain;
}

const SECURITY_MEASURES: SecurityMeasure[] = [
  {
    icon: '🏢',
    title: 'בידוד מלא בין לקוחות',
    description: 'כל נתון מסונן אוטומטית לפי הלקוח המחובר ברמת מסד הנתונים עצמו, לא רק בממשק - משרד אחד לא יכול לראות או לשנות נתונים של משרד אחר, גם לא דרך קריאה ישירה ל-API.',
    explain: {
      source: 'backend',
      body: [
        'מיושם כ-Global Query Filter במקום אחד ב-DbContext, על כל Entity עסקי (תקריות, משתמשים) - מסנן לפי TenantId אוטומטית בכל שאילתה, מכל שירות.',
        'מפתח שכותב שירות חדש לא יכול "לשכוח" את הסינון - הוא לא תלוי בכתיבה נכונה בכל מקום בנפרד, הוא נאכף מרכזית.',
      ],
    },
  },
  {
    icon: '🔑',
    title: 'בקרת גישה ברמת הרשומה',
    description: 'משתמש רגיל יכול לערוך או למחוק רק מידע שהוא עצמו דיווח. פעולות מנהל (Admin) דורשות הרשאה מפורשת שנבדקת בשרת בכל בקשה, לא רק מוסתרות בממשק.',
    explain: {
      source: 'backend',
      body: [
        'הבדיקה קורית בקוד השרת (Controller), בכל בקשה בנפרד - לדוגמה בדיקת IsSiteAdmin לפני גישה לפעולות ניהול חוצות-לקוחות.',
        'הסתרת כפתור בממשק היא נוחות בלבד למשתמש - גם אם מישהו יעקוף את הממשק ויפנה ישירות ל-API, הבדיקה בשרת עדיין חוסמת אותו.',
      ],
    },
  },
  {
    icon: '🚫',
    title: 'הגנה מפני ניחוש סיסמאות',
    description: 'שתי שכבות עצמאיות: הגבלת קצב לפי כתובת רשת, ונעילת חשבון זמנית אחרי כמה ניסיונות כושלים רצופים - בלי קשר מאיפה הניסיונות מגיעים.',
    explain: {
      source: 'backend',
      body: [
        'בפועל יש שלוש שכבות, לא רק שתיים: הגבלת קצב ייעודית לנתיב ההתחברות, נעילת חשבון אחרי 5 ניסיונות כושלים ל-15 דקות, ועוד שכבה שלא מוזכרת כאן - חסימת כתובת IP שלמה אם היא גרמה לנעילה של כמה חשבונות שונים בתוך 24 שעות.',
        'שלוש השכבות רצות בקוד השרת (AuthService), לא תלויות בממשק.',
      ],
    },
  },
  {
    icon: '🔒',
    title: 'הצפנת תעבורה מלאה',
    description: 'כל תקשורת מוצפנת ב-HTTPS בלבד, עם מדיניות אבטחה נוספת (Security Headers, HSTS, CSP) שמונעת וקטורי תקיפה נפוצים כמו הטמעת האתר בחלון זר.',
    explain: {
      source: 'cloud',
      body: [
        'ה-HTTPS עצמו נאכף ברמת התשתית (httpsOnly מוגדר על משאב ה-App Service בענן) - לא בקוד האפליקציה.',
        'ה-Security Headers מוגדרים בשני מקומות נפרדים: בצד הלקוח (קובץ הגדרות סטטי של האתר) ובצד השרת (קוד ה-API) - כל אחד מגן על התעבורה שלו בנפרד.',
      ],
    },
  },
  {
    icon: '🧩',
    title: 'מניעת דליפת מידע משגיאות',
    description: 'שגיאת שרת בלתי צפויה לעולם לא חושפת פרטים פנימיים (מבנה מסד נתונים, נתיבי קבצים) ללקוח - רק לצוות הפיתוח, דרך יומן מאובטח.',
    explain: {
      source: 'backend',
      body: [
        'מקום מרכזי יחיד (Exception Handler מובנה) תופס כל חריגה מכל שכבה בקוד. חריגה "לא צפויה" מקבלת תמיד הודעה גנרית וקבועה ללקוח - הפרטים האמיתיים נשמרים רק בלוג הפנימי של השרת.',
      ],
    },
  },
  {
    icon: '🔄',
    title: 'סריקת תלויות אוטומטית',
    description: 'כל ספריות הקוד (צד שרת וצד לקוח) נסרקות באופן שוטף מול מאגרי פגיעויות ידועים, עם עדכון אוטומטי כשמתגלה חולשה חדשה.',
    explain: {
      source: 'cloud',
      body: [
        'הסריקה עצמה אמיתית - מוגדרת בהגדרות ה-repo (Dependabot), בודקת שבועית גם את ספריות השרת וגם את ספריות הלקוח.',
        'דיוק קטן לתיאור: "עדכון אוטומטי" הוא לא מדויק לגמרי - הכלי פותח בקשת-שינוי (Pull Request) לבדיקה, לא ממזג אותה לבד. זה עדיין דורש אישור אדם לפני שהעדכון באמת נכנס.',
      ],
    },
  },
  {
    icon: '🧪',
    title: 'בדיקות אבטחה אוטומטיות',
    description: 'חבילת בדיקות ייעודית רצה אחרי כל שינוי שנוגע בהרשאות או באימות - מוודאת שהגנות קיימות לא נשברות בשינויים עתידיים.',
    explain: {
      source: 'gap',
      body: [
        'בבדיקה מול הקוד בפועל: כרגע אין חבילת בדיקות ייעודית לאימות/הרשאות. קיימות 3 בדיקות אוטומטיות בפרויקט, אך הן מכסות נושאים אחרים (זיהוי כפילויות תקריות, תור הודעות פנימי, ניתוח טלמטריה) - לא את תחום האבטחה.',
        'זה פער אמיתי בין התיאור למצב הנוכחי, לא רק ניסוח-יתר - שווה להחליט אם לסגור אותו (להוסיף בדיקות) או לעדכן את התיאור בעמוד בהתאם.',
      ],
    },
  },
  {
    icon: '📋',
    title: 'יומן ביקורת למסד הנתונים',
    description: 'כל פעולה מול מסד הנתונים - קריאה, כתיבה, שינוי מבנה - נרשמת אוטומטית ביומן ביקורת (Audit Log) נפרד ובלתי תלוי באפליקציה עצמה, לצורך חקירת תקריות ועמידה בדרישות רגולטוריות.',
    explain: {
      source: 'gap',
      body: [
        'בבדיקה מול הקוד בפועל: קיים כרגע יומן חלקי בלבד, המתעד ניסיונות התחברות בלבד (הצלחה/כישלון/נעילה) - לא כל פעולת DB (קריאה/כתיבה/שינוי מבנה) כפי שהתיאור מרמז.',
        'בנוסף, היומן הזה רץ בתוך קוד האפליקציה עצמה, לא כיומן ביקורת נפרד ובלתי-תלוי ברמת מסד הנתונים (כמו Azure SQL Auditing, שלא מוגדר כרגע בתשתית).',
      ],
    },
  },
];

export const SecurityTrustPage: React.FC = () => {
  const [openMeasure, setOpenMeasure] = useState<string | null>(null);

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
              position: 'relative',
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
            <div style={{ position: 'absolute', top: '14px', left: '14px' }}>
              <InfoButton onClick={() => setOpenMeasure(measure.title)} />
            </div>
            <span style={{ fontSize: '28px' }}>{measure.icon}</span>
            <div style={{ fontSize: '14px', fontWeight: 700, color: colors.textPrimary }}>
              {measure.title}
            </div>
            <div style={{ fontSize: '12px', color: colors.textMuted, lineHeight: 1.6 }}>
              {measure.description}
            </div>
            {openMeasure === measure.title && (
              <MetricInfoModal
                title={measure.title}
                source={measure.explain.source}
                body={measure.explain.body}
                onClose={() => setOpenMeasure(null)}
              />
            )}
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
        <p style={{ fontSize: '12.5px', color: colors.textMuted, lineHeight: 1.7, marginBottom: '20px' }}>
          שלושה כלים חיצוניים ובלתי-תלויים, כל אחד בודק זווית אחרת, מריצים בדיקה אמיתית מול
          השרתים האמיתיים של המערכת - לא דמו, לא דוח שלנו. התוצאה מוצגת ישירות על ידי השירות
          החיצוני.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {VERIFICATION_TOOLS.map((tool) => (
            <div
              key={tool.label}
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                paddingTop: '14px',
                borderTop: `1px solid ${colors.border}`,
              }}
            >
              <div style={{ minWidth: '220px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: colors.textPrimary }}>
                  {tool.label}
                </div>
                <div style={{ fontSize: '11.5px', color: colors.textMuted, marginTop: '2px' }}>
                  {tool.description}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <a
                  href={tool.urlBuilder(FRONTEND_DOMAIN)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    padding: '8px 16px',
                    borderRadius: radius.md,
                    backgroundColor: colors.accent,
                    color: '#ffffff',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    textDecoration: 'none',
                    whiteSpace: 'nowrap',
                  }}
                >
                  שרת האתר ↗
                </a>
                <a
                  href={tool.urlBuilder(BACKEND_DOMAIN)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    padding: '8px 16px',
                    borderRadius: radius.md,
                    backgroundColor: 'transparent',
                    color: colors.accentSoft,
                    fontSize: '12.5px',
                    fontWeight: 700,
                    textDecoration: 'none',
                    border: `1px solid ${colors.border}`,
                    whiteSpace: 'nowrap',
                  }}
                >
                  שרת ה-API ↗
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          marginTop: '20px',
          padding: '22px 24px',
          backgroundColor: colors.surfaceRaised,
          border: `1px solid ${colors.border}`,
          borderRadius: radius.lg,
          boxShadow: shadow.card,
        }}
      >
        <div style={{ fontSize: '15px', fontWeight: 700, color: colors.textPrimary, marginBottom: '6px' }}>
          בדיקה מעמיקה של מדיניות ה-CSP (Google CSP Evaluator)
        </div>
        <p style={{ fontSize: '12.5px', color: colors.textMuted, lineHeight: 1.7, marginBottom: '16px' }}>
          בניגוד לשלושת הכלים למעלה שרק בודקים אם קיימת מדיניות CSP, הכלי הזה בודק את התוכן שלה
          עצמה - האם היא אכן חוסמת וקטורי תקיפה נפוצים כמו הזרקת קוד (XSS). הכלי לא תומך בקישור
          ישיר לפי דומיין - יש להעתיק את המדיניות הרלוונטית ולהדביק אותה בכלי.
        </p>
        <a
          href={CSP_EVALUATOR_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-block',
            padding: '8px 16px',
            borderRadius: radius.md,
            backgroundColor: colors.accent,
            color: '#ffffff',
            fontSize: '12.5px',
            fontWeight: 700,
            textDecoration: 'none',
            marginBottom: '18px',
          }}
        >
          פתיחת CSP Evaluator ↗
        </a>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[
            { label: 'מדיניות ה-CSP של שרת האתר', value: FRONTEND_CSP },
            { label: 'מדיניות ה-CSP של שרת ה-API', value: BACKEND_CSP },
          ].map((row) => (
            <div key={row.label}>
              <div style={{ fontSize: '11.5px', color: colors.textMuted, marginBottom: '4px' }}>
                {row.label}
              </div>
              <code
                style={{
                  display: 'block',
                  padding: '10px 12px',
                  backgroundColor: colors.card,
                  border: `1px solid ${colors.border}`,
                  borderRadius: radius.md,
                  fontSize: '11px',
                  color: colors.textSecondary,
                  direction: 'ltr',
                  textAlign: 'left',
                  wordBreak: 'break-all',
                  userSelect: 'all',
                }}
              >
                {row.value}
              </code>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SecurityTrustPage;
