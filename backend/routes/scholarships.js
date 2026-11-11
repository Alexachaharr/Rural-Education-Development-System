import { Router } from 'express';
import { getDb } from '../database/db.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const router = Router();

// ─── LIST SCHOLARSHIPS ────────────────────────────────────────────────────────
// Students also get `applied` / `application_status` for each scholarship.
router.get('/', authMiddleware, (req, res) => {
  const db = getDb();
  const { category, q } = req.query;

  let query = `
    SELECT s.*, sa.status AS application_status, sa.applied_at
    FROM scholarships s
    LEFT JOIN scholarship_applications sa ON sa.scholarship_id = s.id AND sa.user_id = ?
    WHERE s.is_active = 1
  `;
  const params = [req.user.id];

  if (category) { query += ' AND s.category = ?'; params.push(category); }
  if (q) { query += ' AND (s.title LIKE ? OR s.provider LIKE ?)'; params.push(`%${q}%`, `%${q}%`); }

  query += ' ORDER BY s.deadline ASC';
  const rows = db.prepare(query).all(...params);
  return res.json(rows.map((r) => ({ ...r, applied: !!r.application_status })));
});

// ─── CATEGORIES ───────────────────────────────────────────────────────────────
router.get('/categories', authMiddleware, (req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT DISTINCT category FROM scholarships WHERE is_active=1 AND category IS NOT NULL ORDER BY category').all();
  return res.json(rows.map((r) => r.category));
});

// ─── MY APPLICATIONS (Student) ────────────────────────────────────────────────
router.get('/my-applications', authMiddleware, (req, res) => {
  const db = getDb();
  const rows = db.prepare(`
    SELECT sa.*, s.title, s.amount, s.provider, s.deadline, s.apply_url
    FROM scholarship_applications sa JOIN scholarships s ON sa.scholarship_id = s.id
    WHERE sa.user_id = ?
    ORDER BY sa.applied_at DESC
  `).all(req.user.id);
  return res.json(rows);
});

// ─── COMPETITIONS ─────────────────────────────────────────────────────────────
router.get('/competitions', authMiddleware, (req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM competitions WHERE is_active=1 ORDER BY event_date ASC').all();
  return res.json(rows);
});

// ─── GET ONE ──────────────────────────────────────────────────────────────────
router.get('/:id', authMiddleware, (req, res) => {
  const db = getDb();
  const row = db.prepare('SELECT * FROM scholarships WHERE id=?').get(parseInt(req.params.id));
  if (!row) return res.status(404).json({ error: 'Scholarship not found' });
  return res.json(row);
});

// ─── APPLY / TRACK (Student) ──────────────────────────────────────────────────
router.post('/:id/apply', authMiddleware, requireRole('student'), (req, res) => {
  const db = getDb();
  const id = parseInt(req.params.id);
  const scholarship = db.prepare('SELECT * FROM scholarships WHERE id=? AND is_active=1').get(id);
  if (!scholarship) return res.status(404).json({ error: 'Scholarship not found' });

  const existing = db.prepare('SELECT id FROM scholarship_applications WHERE scholarship_id=? AND user_id=?').get(id, req.user.id);
  if (existing) return res.status(409).json({ error: 'You have already applied for this scholarship' });

  db.prepare('INSERT INTO scholarship_applications (scholarship_id, user_id) VALUES (?, ?)').run(id, req.user.id);
  return res.status(201).json({ success: true, message: 'Application recorded', apply_url: scholarship.apply_url });
});

// ─── WITHDRAW (Student) ───────────────────────────────────────────────────────
router.delete('/:id/apply', authMiddleware, requireRole('student'), (req, res) => {
  const db = getDb();
  const info = db.prepare('DELETE FROM scholarship_applications WHERE scholarship_id=? AND user_id=?').run(parseInt(req.params.id), req.user.id);
  if (!info.changes) return res.status(404).json({ error: 'Application not found' });
  return res.json({ success: true });
});

// ─── CREATE (Teacher) ─────────────────────────────────────────────────────────
router.post('/', authMiddleware, requireRole('teacher'), (req, res) => {
  const db = getDb();
  const { title, amount, provider, deadline, eligibility, category, description, apply_url } = req.body;
  if (!title || !amount || !provider || !deadline) {
    return res.status(400).json({ error: 'Title, amount, provider and deadline are required' });
  }
  const result = db.prepare(`
    INSERT INTO scholarships (title, amount, provider, deadline, eligibility, category, description, apply_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(title, amount, provider, deadline, eligibility || null, category || null, description || null, apply_url || null);
  const row = db.prepare('SELECT * FROM scholarships WHERE id=?').get(result.lastInsertRowid);
  return res.status(201).json(row);
});

export default router;
