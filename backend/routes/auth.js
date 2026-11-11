import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { getDb } from '../database/db.js';
import { signToken, authMiddleware } from '../middleware/auth.js';

const router = Router();

function sanitizeUser(user) {
  const { password_hash, otp, otp_expires, ...safe } = user;
  return safe;
}

router.post('/signup', (req, res) => {
  const db = getDb();
  const { name, email, mobile, password, role, class_grade, stream, roll_number, school_id, school_name, board } = req.body;
  if (!name || !password || (!email && !mobile))
    return res.status(400).json({ error: 'Name, password, and email or mobile are required' });
  if (password.length < 6)
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  if (email) {
    const ex = db.prepare('SELECT id FROM users WHERE email=?').get(email);
    if (ex) return res.status(409).json({ error: 'Email already registered' });
  }
  if (mobile) {
    const ex = db.prepare('SELECT id FROM users WHERE mobile=? AND password_hash IS NOT NULL').get(mobile);
    if (ex) return res.status(409).json({ error: 'Mobile already registered' });
  }
  const password_hash = bcrypt.hashSync(password, 12);
  let resolvedSchoolName = school_name;
  if (school_id) {
    const school = db.prepare('SELECT name FROM schools WHERE id=?').get(parseInt(school_id));
    if (school) resolvedSchoolName = school.name;
  }
  const safeRole = ['student', 'teacher', 'parent'].includes(role) ? role : 'student';
  const values = [name, email||null, mobile||null, password_hash, safeRole, class_grade||null, stream||null, roll_number||null, school_id?parseInt(school_id):null, resolvedSchoolName||null, board||'CBSE'];
  try {
    // A mobile number that only ever used OTP login has a placeholder row — complete it instead of inserting
    const placeholder = mobile ? db.prepare('SELECT id FROM users WHERE mobile=? AND password_hash IS NULL').get(mobile) : null;
    let userId;
    if (placeholder) {
      db.prepare(
        `UPDATE users SET name=?,email=?,mobile=?,password_hash=?,role=?,class_grade=?,stream=?,roll_number=?,school_id=?,school_name=?,board=? WHERE id=?`
      ).run(...values, placeholder.id);
      userId = placeholder.id;
    } else {
      const result = db.prepare(
        `INSERT INTO users (name,email,mobile,password_hash,role,class_grade,stream,roll_number,school_id,school_name,board)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)`
      ).run(...values);
      userId = result.lastInsertRowid;
    }
    const user = db.prepare('SELECT * FROM users WHERE id=?').get(userId);
    const token = signToken({ id: user.id, role: user.role, name: user.name, email: user.email });
    return res.status(201).json({ token, user: sanitizeUser(user) });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/login', (req, res) => {
  const db = getDb();
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  const user = db.prepare('SELECT * FROM users WHERE email=?').get(email);
  if (!user || !user.password_hash) return res.status(401).json({ error: 'Invalid credentials' });
  if (!bcrypt.compareSync(password, user.password_hash)) return res.status(401).json({ error: 'Invalid credentials' });
  const token = signToken({ id: user.id, role: user.role, name: user.name, email: user.email });
  return res.json({ token, user: sanitizeUser(user) });
});

router.post('/request-otp', (req, res) => {
  const db = getDb();
  const { mobile } = req.body;
  if (!mobile) return res.status(400).json({ error: 'Mobile number required' });
  const clean = mobile.replace(/[\s\-]/g, '').replace(/^\+91/, '');
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expires = Date.now() + 10 * 60 * 1000;
  const user = db.prepare('SELECT id FROM users WHERE mobile=?').get(clean);
  if (user) {
    db.prepare('UPDATE users SET otp=?, otp_expires=? WHERE mobile=?').run(otp, expires, clean);
  } else {
    db.prepare(`INSERT OR REPLACE INTO users (mobile,otp,otp_expires,name,role) VALUES (?,?,?,'New User','student')`).run(clean, otp, expires);
  }
  console.log(`OTP for ${clean}: ${otp}`);
  return res.json({ success: true, message: 'OTP sent to mobile', ...(process.env.NODE_ENV !== 'production' && { dev_otp: otp }) });
});

router.post('/verify-otp', (req, res) => {
  const db = getDb();
  const { mobile, otp } = req.body;
  if (!mobile || !otp) return res.status(400).json({ error: 'Mobile and OTP required' });
  const clean = mobile.replace(/[\s\-]/g, '').replace(/^\+91/, '');
  const user = db.prepare('SELECT * FROM users WHERE mobile=? AND otp=?').get(clean, otp);
  if (!user) return res.status(401).json({ error: 'Invalid OTP' });
  if (!user.otp_expires || user.otp_expires < Date.now()) return res.status(401).json({ error: 'OTP expired' });
  db.prepare('UPDATE users SET otp=NULL, otp_expires=NULL WHERE id=?').run(user.id);
  const token = signToken({ id: user.id, role: user.role, name: user.name, email: user.email });
  return res.json({ token, user: sanitizeUser(user) });
});

router.get('/me', authMiddleware, (req, res) => {
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE id=?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  return res.json(sanitizeUser(user));
});

export default router;
