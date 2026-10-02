// שגיאה ייעודית לפקיעת session (401 מהשרת על קריאה שדרשה טוקן תקף) - נבדלת
// מכשל API רגיל כדי שמקומות הדיווח על תקלות ידעו לא לדווח עליה כבאג (זו
// התנהגות צפויה - הטוקן פג, לא תקלה בקוד)
export class SessionExpiredError extends Error {
  constructor() {
    super('ההתחברות שלך פגה - יש להתחבר מחדש');
    this.name = 'SessionExpiredError';
  }
}
