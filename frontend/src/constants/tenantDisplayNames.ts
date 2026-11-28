// שמות תצוגה בעברית לכל Tenant - קוסמטי בלבד, אין להם שום ייצוג ב-DB
// (ה-TenantId עצמו הוא ה-slug הטכני, למשל "cohen-gold-law")
export const TENANT_DISPLAY_NAMES: Record<string, string> = {
  'default-tenant': 'המשרד הראשי',
  'halevy-mizrahi-law': 'הלוי-מזרחי, משרד עורכי דין',
  'cohen-gold-law': "כהן-גולד ושות', עורכי דין",
  'mizrahi-partners': 'מזרחי ושותפים, משרד עורכי דין',
  'ben-ami-legal': 'בן-עמי משפטי',
};

// "default-tenant" הוא גם ה-slug האמיתי של המשרד הראשי וגם ה-sentinel
// הקבוע שמשתמשים בו Service Health webhooks של Azure
// (AzureAlertsController.PlatformTenantId) - לתקריות כאלו אין בכלל משרד
// אמיתי מאחוריהן, אז יש להבחין ביניהן לפי Subsystem ("Azure Platform"),
// לא לפי TenantId בלבד
export function getTenantDisplayName(tenantId: string, subsystem?: string | null): string {
  if (subsystem === 'Azure Platform') {
    return 'תשתית Azure (לא משרד)';
  }
  return TENANT_DISPLAY_NAMES[tenantId] ?? tenantId;
}

// משותף בין TenantScaleTestCard (שיוצר את התקריות המלאכותיות האלו) לבין
// IncidentTable (שמקבץ אותן לשורה אחת בתצוגה) - מקור יחיד כדי ששני
// הצדדים תמיד יזהו את אותו דפוס
export const SCALE_TEST_TENANT_PREFIX = 'scale-test-tenant-';

export function isScaleTestTenant(tenantId: string): boolean {
  return tenantId.startsWith(SCALE_TEST_TENANT_PREFIX);
}
