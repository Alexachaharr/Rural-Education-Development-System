import { Router } from 'express';
import { getDb } from '../database/db.js';

const router = Router();

// Search schools (autocomplete)
router.get('/search', (req, res) => {
  const db = getDb();
  const { q, state, limit = 20 } = req.query;
  
  if (!q || q.length < 2) {
    return res.json([]);
  }

  let query = `SELECT id, name, city, district, state, board, pincode FROM schools WHERE name LIKE ?`;
  const params = [`%${q}%`];

  if (state) {
    query += ` AND state = ?`;
    params.push(state);
  }

  query += ` ORDER BY name ASC LIMIT ?`;
  params.push(parseInt(limit));

  const schools = db.prepare(query).all(...params);
  return res.json(schools);
});

// Get all states
router.get('/states', (req, res) => {
  const db = getDb();
  const states = db.prepare('SELECT DISTINCT state FROM schools ORDER BY state ASC').all();
  return res.json(states.map(s => s.state));
});

// Get school by ID
router.get('/:id', (req, res) => {
  const db = getDb();
  const school = db.prepare('SELECT * FROM schools WHERE id=?').get(parseInt(req.params.id));
  if (!school) return res.status(404).json({ error: 'School not found' });
  return res.json(school);
});

export default router;
