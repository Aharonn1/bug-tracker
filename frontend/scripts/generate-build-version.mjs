import { writeFileSync, mkdirSync, existsSync } from 'node:fs';

// מזהה build ייחודי לכל בנייה - נכתב ל-public כך שהוא נכלל ב-dist כקובץ
// JSON סטטי לא-ממוספר (בניגוד לקבצי ה-JS/CSS של Vite) ונטען מחדש בכל פעם
// עם cache: 'no-store'. ה-timestamp לבדו מספיק: המטרה היא רק להבחין בין
// "מה שרץ בטאב הפתוח עכשיו" לבין "מה שבאמת פרוס עכשיו בשרת", לא להצביע
// על קומיט ספציפי
const buildId = String(Date.now());

if (!existsSync('public')) mkdirSync('public');
writeFileSync('public/build-version.json', JSON.stringify({ buildId }));

console.log(`[generate-build-version] buildId = ${buildId}`);
