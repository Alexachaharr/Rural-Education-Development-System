import { Router } from 'express';
import { getDb } from '../database/db.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createReadStream, existsSync, statSync } from 'fs';
import multer from 'multer';

const __dirname = dirname(fileURLToPath(import.meta.url));
const router = Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const folder = file.mimetype.startsWith('video/') ? 'videos' : 'pdfs';
    cb(null, join(__dirname, '../uploads', folder));
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + '-' + file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_'));
  },
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

// ─── GET SUBJECTS by class + board ────────────────────────────────────────────
router.get('/subjects', authMiddleware, (req, res) => {
  const db = getDb();
  const { class_grade, board, stream } = req.query;
  
  let query = `SELECT s.*,
    (SELECT COUNT(*) FROM chapters c WHERE c.subject_id = s.id) AS chapter_count,
    (SELECT COUNT(*) FROM content ct JOIN chapters c ON ct.chapter_id = c.id WHERE c.subject_id = s.id) AS content_count
    FROM subjects s WHERE 1=1`;
  const params = [];

  if (class_grade) { query += ' AND s.class_grade=?'; params.push(class_grade); }
  if (board) { query += ' AND s.board=?'; params.push(board); }
  if (stream) { query += ' AND (s.stream IS NULL OR s.stream=?)'; params.push(stream); }

  query += ' ORDER BY chapter_count DESC, s.name ASC';
  const subjects = db.prepare(query).all(...params);
  return res.json(subjects);
});

// ─── GET CHAPTERS by subject ───────────────────────────────────────────────────
router.get('/chapters/:subjectId', authMiddleware, (req, res) => {
  const db = getDb();
  const subjectId = parseInt(req.params.subjectId);
  const subject = db.prepare('SELECT * FROM subjects WHERE id=?').get(subjectId);
  if (!subject) return res.status(404).json({ error: 'Subject not found' });
  const chapters = db.prepare(`
    SELECT c.*, (SELECT COUNT(*) FROM content ct WHERE ct.chapter_id = c.id) AS content_count
    FROM chapters c WHERE c.subject_id=? ORDER BY c.chapter_number ASC
  `).all(subjectId);
  return res.json({ subject, chapters });
});

// ─── GET CONTENT by chapter ────────────────────────────────────────────────────
router.get('/content/:chapterId', authMiddleware, (req, res) => {
  const db = getDb();
  const content = db.prepare('SELECT * FROM content WHERE chapter_id=? ORDER BY type DESC, id ASC').all(parseInt(req.params.chapterId));
  return res.json(content);
});

// ─── DOWNLOAD / SERVE PDF ──────────────────────────────────────────────────────
router.get('/download/:contentId', authMiddleware, (req, res) => {
  const db = getDb();
  const content = db.prepare('SELECT * FROM content WHERE id=?').get(parseInt(req.params.contentId));
  
  if (!content) return res.status(404).json({ error: 'Content not found' });
  if (content.type !== 'pdf') return res.status(400).json({ error: 'Not a downloadable file' });

  const filePath = join(__dirname, '../uploads/pdfs', content.filename || '');
  
  if (content.filename && existsSync(filePath)) {
    const stat = statSync(filePath);
    res.setHeader('Content-Disposition', `attachment; filename="${content.filename}"`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', stat.size);
    createReadStream(filePath).pipe(res);
  } else {
    // Demo content has no real file yet → generate a small, valid PDF on the fly
    const chapter = db.prepare(`
      SELECT c.title AS chapter_title, s.name AS subject_name, s.class_grade
      FROM chapters c JOIN subjects s ON c.subject_id = s.id WHERE c.id=?
    `).get(content.chapter_id);
    const pdf = buildSamplePdf(content.title, chapter);
    res.setHeader('Content-Disposition', `attachment; filename="${content.title.replace(/[^a-z0-9]+/gi, '_')}.pdf"`);
    res.setHeader('Content-Type', 'application/pdf');
    return res.send(pdf);
  }
});

// Builds a minimal single-page PDF with correct byte offsets
function buildSamplePdf(title, chapter) {
  const esc = (t) => String(t ?? '').replace(/[^\x20-\x7E]/g, '-').replace(/([\\()])/g, '\\$1');
  const lines = [
    ['F2', 20, title],
    ['F1', 12, chapter ? `${chapter.subject_name} - Class ${chapter.class_grade}` : ''],
    ['F1', 12, chapter ? `Chapter: ${chapter.chapter_title}` : ''],
    ['F1', 12, ''],
    ['F1', 12, 'NCERT Chapter Notes - Rural Education Platform'],
    ['F1', 12, 'Full notes will appear here once your teacher uploads the file.'],
  ];
  let stream = 'BT 50 780 Td\n';
  lines.forEach(([font, size, text], i) => {
    stream += `${i ? '0 -26 Td ' : ''}/${font} ${size} Tf (${esc(text)}) Tj\n`;
  });
  stream += 'ET';

  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>',
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>',
  ];
  let out = '%PDF-1.4\n';
  const offsets = [];
  objects.forEach((obj, i) => {
    offsets.push(Buffer.byteLength(out));
    out += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xref = Buffer.byteLength(out);
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((o) => { out += `${String(o).padStart(10, '0')} 00000 n \n`; });
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(out, 'binary');
}

// ─── UPLOAD CONTENT (Teacher) ─────────────────────────────────────────────────
router.post('/upload', authMiddleware, requireRole('teacher'), upload.single('file'), (req, res) => {
  const db = getDb();
  const { chapter_id, title, type, url, duration_mins } = req.body;

  if (!chapter_id || !title || !type) {
    return res.status(400).json({ error: 'chapter_id, title, and type are required' });
  }
  if (!['pdf', 'video', 'notes'].includes(type)) {
    return res.status(400).json({ error: 'type must be pdf, video or notes' });
  }
  if (type === 'video' && !url && !req.file) {
    return res.status(400).json({ error: 'Add a video link or upload a video file' });
  }
  if (type === 'pdf' && !req.file) {
    return res.status(400).json({ error: 'Please attach a PDF file' });
  }

  let filename = null;
  let file_path = null;

  if (req.file) {
    filename = req.file.filename;
    file_path = req.file.path;
  }

  // Accept normal YouTube links and convert them to embeddable ones
  let videoUrl = url || null;
  const yt = videoUrl && videoUrl.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/);
  if (yt) videoUrl = `https://www.youtube.com/embed/${yt[1]}`;
  if (type === 'video' && req.file) videoUrl = `/uploads/videos/${req.file.filename}`;

  const size_mb = req.file ? +(req.file.size / 1048576).toFixed(2) : null;

  const result = db.prepare(`
    INSERT INTO content (chapter_id, title, type, url, filename, file_path, duration_mins, size_mb) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(parseInt(chapter_id), title, type, videoUrl, filename, file_path, duration_mins ? parseInt(duration_mins) : null, size_mb);

  const content = db.prepare('SELECT * FROM content WHERE id=?').get(result.lastInsertRowid);
  return res.status(201).json(content);
});

export default router;
