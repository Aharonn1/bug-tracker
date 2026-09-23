import React, { useState } from 'react';
import { useBugs } from '../hooks/useBugs';
import { BugPriority } from '../types/bug.types';

interface BugFormProps {
  onBugCreated?: () => void;
}

export const BugForm: React.FC<BugFormProps> = ({ onBugCreated }) => {
  const { addBug } = useBugs();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [systemModule, setSystemModule] = useState('שערי תהיל״ה');
  const [priority, setPriority] = useState<BugPriority>(BugPriority.Medium);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    try {
      setIsSubmitting(true);
      await addBug({
        title,
        description,
        systemModule,
        priority,
      });
      setTitle('');
      setDescription('');
      if (onBugCreated) onBugCreated();
    } catch (err: any) {
      alert(`שגיאה בשמירת הבאג: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    backgroundColor: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '8px',
    color: '#f8fafc',
    fontSize: '13px',
    marginTop: '6px',
    boxSizing: 'border-box'
  };

  return (
    <form onSubmit={handleSubmit} style={{ background: '#1e293b', padding: '24px', borderRadius: '12px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label style={{ fontSize: '13px', color: '#94a3b8' }}>כותרת התקלה</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="לדוגמה: שגיאת חתימה דיגיטלית במסמך כתב תביעה"
          required
          style={inputStyle}
        />
      </div>

      <div>
        <label style={{ fontSize: '13px', color: '#94a3b8' }}>מודול מערכת</label>
        <select
          value={systemModule}
          onChange={(e) => setSystemModule(e.target.value)}
          style={inputStyle}
        >
          <option value="נט המשפט - שידור">נט המשפט - שידור</option>
          <option value="הוצאה לפועל - פתיחת תיק">הוצאה לפועל - פתיחת תיק</option>
          <option value="שערי תהיל״ה">שערי תהיל״ה</option>
          <option value="מנוע הפקת מסמכים">מנוע הפקת מסמכים</option>
          <option value="סנכרון תורים">סנכרון תורים</option>
        </select>
      </div>

      <div>
        <label style={{ fontSize: '13px', color: '#94a3b8' }}>רמת עדיפות</label>
        <select
          value={priority}
          onChange={(e) => setPriority(Number(e.target.value) as BugPriority)}
          style={inputStyle}
        >
          <option value={BugPriority.Low}>נמוך</option>
          <option value={BugPriority.Medium}>בינוני</option>
          <option value={BugPriority.High}>גבוה</option>
          <option value={BugPriority.Critical}>קריטי</option>
        </select>
      </div>

      <div>
        <label style={{ fontSize: '13px', color: '#94a3b8' }}>פירוט טכני והודעת שגיאה</label>
        <textarea
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="תיאור מפורט של התקלה..."
          required
          style={{ ...inputStyle, resize: 'vertical' }}
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        style={{
          padding: '12px',
          backgroundColor: '#2563eb',
          color: '#fff',
          border: 'none',
          borderRadius: '8px',
          cursor: isSubmitting ? 'not-allowed' : 'pointer',
          fontWeight: 'bold',
          fontSize: '14px',
          marginTop: '8px'
        }}
      >
        {isSubmitting ? 'שומר דיווח...' : 'שלח דיווח למערכת'}
      </button>
    </form>
  );
};

export default BugForm;