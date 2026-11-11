// Must be the first import: loads .env before other modules read process.env
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync } from 'fs';
import authRoutes from './routes/auth.js';
import schoolRoutes from './routes/schools.js';
import courseRoutes from './routes/courses.js';
import quizRoutes from './routes/quizzes.js';
import attendanceRoutes from './routes/attendance.js';
import scholarshipRoutes from './routes/scholarships.js';
import userRoutes from './routes/users.js';
import { getDb } from './database/db.js';
import { seedIfEmpty } from './database/seed.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 5000;

// Ensure dirs exist
mkdirSync(join(__dirname, 'database'), { recursive: true });
mkdirSync(join(__dirname, 'uploads/pdfs'), { recursive: true });
mkdirSync(join(__dirname, 'uploads/videos'), { recursive: true });

// ─── MIDDLEWARE ───────────────────────────────────────────────────────────────
// CORS_ORIGIN can be a comma-separated list, e.g.
// "http://localhost:5173,https://rural-edu.pages.dev"
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim().replace(/\/$/, ''))
  .filter(Boolean);

app.use(
  cors({
    origin(origin, cb) {
      // Allow tools like curl/Postman (no origin) and any listed origin
      if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        return cb(null, true);
      }
      console.warn(`CORS: blocked request from ${origin}. Add it to CORS_ORIGIN in .env`);
      return cb(null, false);
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── STATIC UPLOADS ───────────────────────────────────────────────────────────
app.use('/uploads', express.static(join(__dirname, 'uploads')));

// ─── INIT DB (auto-seeds demo data on first run) ──────────────────────────────
getDb();
seedIfEmpty();

// ─── ROUTES ───────────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ name: 'Rural Education API', health: '/api/health' });
});

app.use('/api/auth', authRoutes);
app.use('/api/schools', schoolRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/scholarships', scholarshipRoutes);
app.use('/api/users', userRoutes);

// ─── HEALTH CHECK ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// ─── ERROR HANDLER ────────────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err.stack || err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`\n🚀 Rural Education API running at http://localhost:${PORT}`);
  console.log(`📚 Health check: http://localhost:${PORT}/api/health\n`);
});
