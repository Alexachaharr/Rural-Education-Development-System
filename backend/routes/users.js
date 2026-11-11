import { Router } from 'express';
import { getDb } from '../database/db.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import bcrypt from 'bcryptjs';

const router = Router();

function sanitizeUser(user) {
  const { password_hash, otp, otp_expires, ...safe } = user;
  return safe;
}

// ─── GET MY PROFILE ────────────────────────────────────────────────────────────
router.get('/me', authMiddleware, (req, res) => {
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE id=?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  return res.json(sanitizeUser(user));
});

// ─── UPDATE PROFILE ───────────────────────────────────────────────────────────
router.patch('/me', authMiddleware, (req, res) => {
  const db = getDb();
  const { name, class_grade, stream, roll_number, school_id, school_name, board } = req.body;

  let resolvedSchoolName = school_name;
  if (school_id) {
    const school = db.prepare('SELECT name FROM schools WHERE id=?').get(parseInt(school_id));
    if (school) resolvedSchoolName = school.name;
  }

  db.prepare(`
    UPDATE users SET name=COALESCE(?,name), class_grade=COALESCE(?,class_grade), 
    stream=COALESCE(?,stream), roll_number=COALESCE(?,roll_number),
    school_id=COALESCE(?,school_id), school_name=COALESCE(?,school_name), board=COALESCE(?,board)
    WHERE id=?
  `).run(name||null, class_grade||null, stream||null, roll_number||null, school_id?parseInt(school_id):null, resolvedSchoolName||null, board||null, req.user.id);

  const user = db.prepare('SELECT * FROM users WHERE id=?').get(req.user.id);
  return res.json(sanitizeUser(user));
});

// ─── CHANGE PASSWORD ──────────────────────────────────────────────────────────
router.post('/change-password', authMiddleware, (req, res) => {
  const db = getDb();
  const { current_password, new_password } = req.body;

  if (!current_password || !new_password) {
    return res.status(400).json({ error: 'Current and new passwords required' });
  }
  if (new_password.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' });
  }

  const user = db.prepare('SELECT * FROM users WHERE id=?').get(req.user.id);
  if (!user.password_hash || !bcrypt.compareSync(current_password, user.password_hash)) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }

  const hash = bcrypt.hashSync(new_password, 12);
  db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(hash, req.user.id);

  return res.json({ success: true, message: 'Password changed successfully' });
});

// ─── GET CHILDREN (Parent) ────────────────────────────────────────────────────
router.get('/my-children', authMiddleware, requireRole('parent'), (req, res) => {
  const db = getDb();
  const children = db.prepare(`
    SELECT u.id, u.name, u.class_grade, u.roll_number, u.school_name, u.board
    FROM parent_child pc JOIN users u ON pc.child_id = u.id
    WHERE pc.parent_id=?
  `).all(req.user.id);
  return res.json(children);
});

// ─── LINK CHILD TO PARENT ─────────────────────────────────────────────────────
router.post('/link-child', authMiddleware, requireRole('parent'), (req, res) => {
  const db = getDb();
  const { child_roll_number, child_school_id } = req.body;

  if (!child_roll_number) return res.status(400).json({ error: 'Child roll number required' });

  let query = 'SELECT * FROM users WHERE role=? AND roll_number=?';
  const params = ['student', child_roll_number];
  if (child_school_id) { query += ' AND school_id=?'; params.push(parseInt(child_school_id)); }

  const child = db.prepare(query).get(...params);
  if (!child) return res.status(404).json({ error: 'Student not found' });

  try {
    db.prepare('INSERT OR IGNORE INTO parent_child (parent_id, child_id) VALUES (?, ?)').run(req.user.id, child.id);
    return res.json({ success: true, child: sanitizeUser(child) });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── GET STUDENT PERFORMANCE (Teacher / Parent) ───────────────────────────────
router.get('/:id/performance', authMiddleware, (req, res) => {
  const db = getDb();
  const studentId = parseInt(req.params.id);

  // Authorization: teacher can see any student, parent only their children
  if (req.user.role === 'student' && req.user.id !== studentId) {
    return res.status(403).json({ error: 'Not authorized' });
  }
  if (req.user.role === 'parent') {
    const link = db.prepare('SELECT id FROM parent_child WHERE parent_id=? AND child_id=?').get(req.user.id, studentId);
    if (!link) return res.status(403).json({ error: 'Not authorized' });
  }

  const quizAttempts = db.prepare(`
    SELECT qa.*, qz.title as quiz_title, s.name as subject_name
    FROM quiz_attempts qa 
    JOIN quizzes qz ON qa.quiz_id=qz.id
    LEFT JOIN subjects s ON qz.subject_id=s.id
    WHERE qa.user_id=?
    ORDER BY qa.completed_at DESC
  `).all(studentId);

  const attendance = db.prepare(`
    SELECT COUNT(CASE WHEN status='present' THEN 1 END) as present,
           COUNT(CASE WHEN status IN ('present','absent') THEN 1 END) as total
    FROM attendance WHERE student_id=?
  `).get(studentId);

  const scholarshipApps = db.prepare('SELECT COUNT(*) as count FROM scholarship_applications WHERE user_id=?').get(studentId);

  return res.json({
    quiz_attempts: quizAttempts,
    attendance: {
      ...attendance,
      percentage: attendance.total > 0 ? Math.round((attendance.present / attendance.total) * 100) : 0,
    },
    scholarship_applications: scholarshipApps.count,
  });
});

export default router;
