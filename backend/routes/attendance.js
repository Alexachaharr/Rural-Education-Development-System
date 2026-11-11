import { Router } from 'express';
import { getDb } from '../database/db.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const router = Router();

// ─── GET ATTENDANCE (Student views their own) ──────────────────────────────────
router.get('/my', authMiddleware, (req, res) => {
  const db = getDb();
  const { month, year } = req.query;

  let query = 'SELECT * FROM attendance WHERE student_id=?';
  const params = [req.user.id];

  if (month && year) {
    query += " AND strftime('%Y', date)=? AND strftime('%m', date)=?";
    params.push(String(year), String(month).padStart(2, '0'));
  } else if (year) {
    query += " AND strftime('%Y', date)=?";
    params.push(String(year));
  }

  query += ' ORDER BY date DESC';
  const records = db.prepare(query).all(...params);

  const present = records.filter(r => r.status === 'present').length;
  const absent = records.filter(r => r.status === 'absent').length;
  const total = records.filter(r => r.status !== 'holiday').length;

  return res.json({
    records,
    summary: {
      present,
      absent,
      total,
      percentage: total > 0 ? Math.round((present / total) * 100) : 0,
    },
  });
});

// ─── GET CLASS ATTENDANCE (Teacher) ───────────────────────────────────────────
router.get('/class', authMiddleware, requireRole('teacher'), (req, res) => {
  const db = getDb();
  const { date, class_grade } = req.query;

  if (!date) return res.status(400).json({ error: 'Date is required' });

  const records = db.prepare(`
    SELECT a.*, u.name as student_name, u.roll_number
    FROM attendance a JOIN users u ON a.student_id=u.id
    WHERE a.date=? AND a.teacher_id=?
    ${class_grade ? 'AND a.class_grade=?' : ''}
    ORDER BY u.roll_number ASC
  `).all(...[date, req.user.id, ...(class_grade ? [class_grade] : [])]);

  return res.json(records);
});

// ─── GET STUDENTS FOR ATTENDANCE ──────────────────────────────────────────────
router.get('/students', authMiddleware, requireRole('teacher'), (req, res) => {
  const db = getDb();
  const { class_grade } = req.query;

  let query = 'SELECT id, name, roll_number, class_grade FROM users WHERE role=?';
  const params = ['student'];
  
  if (class_grade) { query += ' AND class_grade=?'; params.push(class_grade); }

  query += ' ORDER BY roll_number ASC';
  const students = db.prepare(query).all(...params);
  return res.json(students);
});

// ─── MARK ATTENDANCE (Teacher) ─────────────────────────────────────────────────
router.post('/mark', authMiddleware, requireRole('teacher'), (req, res) => {
  const db = getDb();
  const { date, class_grade, attendance } = req.body;
  // attendance: [{ student_id, status }]

  if (!date || !attendance?.length) {
    return res.status(400).json({ error: 'Date and attendance array required' });
  }

  const insertOrUpdate = db.prepare(`
    INSERT INTO attendance (student_id, teacher_id, date, status, class_grade, remarks)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(student_id, date) DO UPDATE SET status=excluded.status, remarks=excluded.remarks
  `);

  const markMany = db.transaction((records) => {
    for (const r of records) {
      insertOrUpdate.run(r.student_id, req.user.id, date, r.status || 'present', class_grade || null, r.remarks || null);
    }
  });

  markMany(attendance);

  return res.json({ success: true, marked: attendance.length });
});

// ─── LOW ATTENDANCE REPORT ────────────────────────────────────────────────────
router.get('/low-attendance', authMiddleware, requireRole('teacher'), (req, res) => {
  const db = getDb();
  const threshold = parseInt(req.query.threshold) || 75;

  const stats = db.prepare(`
    SELECT u.id, u.name, u.roll_number, u.class_grade,
           COUNT(CASE WHEN a.status='present' THEN 1 END) as present_days,
           COUNT(CASE WHEN a.status IN ('present','absent','late') THEN 1 END) as total_days,
           ROUND(COUNT(CASE WHEN a.status='present' THEN 1 END) * 100.0 / 
                 NULLIF(COUNT(CASE WHEN a.status IN ('present','absent','late') THEN 1 END), 0)) as percentage
    FROM users u
    LEFT JOIN attendance a ON u.id = a.student_id
    WHERE u.role='student'
    GROUP BY u.id
    HAVING percentage < ? OR total_days = 0
    ORDER BY percentage ASC
  `).all(threshold);

  return res.json(stats);
});

// ─── PARENT: View child attendance ────────────────────────────────────────────
router.get('/child/:childId', authMiddleware, requireRole('parent'), (req, res) => {
  const db = getDb();
  const childId = parseInt(req.params.childId);

  // Verify parent-child relationship
  const link = db.prepare('SELECT id FROM parent_child WHERE parent_id=? AND child_id=?').get(req.user.id, childId);
  if (!link) return res.status(403).json({ error: 'Not authorized to view this student' });

  const records = db.prepare('SELECT * FROM attendance WHERE student_id=? ORDER BY date DESC LIMIT 60').all(childId);
  const present = records.filter(r => r.status === 'present').length;
  const total = records.filter(r => r.status !== 'holiday').length;

  return res.json({
    records,
    summary: { present, absent: total - present, total, percentage: total > 0 ? Math.round((present / total) * 100) : 0 },
  });
});

export default router;
