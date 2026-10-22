import { readFileSync } from 'node:fs'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// נקרא בזמן build בלבד (npm run prebuild כותב את הקובץ לפני ש-vite רץ);
// ב-dev אין קובץ, ואז 'dev' הוא ברירת מחדל סבירה כי ממילא ל-Vite יש HMR
// משלו ולא צריך זיהוי גרסה ישנה בסביבת פיתוח
function readBuildId(): string {
  try {
    const raw = readFileSync(new URL('./public/build-version.json', import.meta.url), 'utf-8')
    return JSON.parse(raw).buildId ?? 'dev'
  } catch {
    return 'dev'
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __BUILD_ID__: JSON.stringify(readBuildId()),
  },
  build: {
    // 'hidden' - קבצי .map נוצרים ומועלים, אבל בלי הערת sourceMappingURL
    // בבאנדל עצמו, כך שהם לא נחשפים אוטומטית ב-DevTools. עדיין ניתנים
    // להורדה למי שבאמת מחפש - נדרשים כדי שדיווח תקריות בצד-לקוח יוכל
    // לפענח stack trace מכווץ בחזרה לקובץ/שורה המקוריים (ראו resolveSourceLocation.ts)
    sourcemap: 'hidden',
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
  },
})
