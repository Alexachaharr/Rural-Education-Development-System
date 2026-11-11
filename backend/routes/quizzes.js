import { Router } from 'express';
import { getDb } from '../database/db.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const router = Router();

// ─── LIST QUIZZES (by subject or chapter) ─────────────────────────────────────
router.get('/', authMiddleware, (req, res) => {
  const db = getDb();
  const { subject_id, chapter_id, class_grade } = req.query;
  
  let query = `
    SELECT q.*, s.name as subject_name, c.title as chapter_title,
           COUNT(qq.id) as question_count
    FROM quizzes q
    LEFT JOIN subjects s ON q.subject_id = s.id
    LEFT JOIN chapters c ON q.chapter_id = c.id
    LEFT JOIN quiz_questions qq ON q.id = qq.quiz_id
    WHERE q.is_active = 1
  `;
  const params = [];

  if (subject_id) { query += ' AND q.subject_id=?'; params.push(parseInt(subject_id)); }
  if (chapter_id) { query += ' AND q.chapter_id=?'; params.push(parseInt(chapter_id)); }
  if (class_grade) { query += ' AND s.class_grade=?'; params.push(class_grade); }

  query += ' GROUP BY q.id ORDER BY q.created_at DESC';
  const quizzes = db.prepare(query).all(...params);

  // If student, add their attempt status
  if (req.user.role === 'student') {
    return res.json(quizzes.map(quiz => {
      const attempt = db.prepare('SELECT id, score, total_marks, completed_at FROM quiz_attempts WHERE quiz_id=? AND user_id=? ORDER BY completed_at DESC LIMIT 1').get(quiz.id, req.user.id);
      return { ...quiz, last_attempt: attempt || null };
    }));
  }

  return res.json(quizzes);
});

// ─── GET QUIZ WITH QUESTIONS ───────────────────────────────────────────────────
router.get('/:id', authMiddleware, (req, res) => {
  const db = getDb();
  const quiz = db.prepare(`
    SELECT q.*, s.name as subject_name, c.title as chapter_title
    FROM quizzes q
    LEFT JOIN subjects s ON q.subject_id = s.id
    LEFT JOIN chapters c ON q.chapter_id = c.id
    WHERE q.id=?
  `).get(parseInt(req.params.id));

  if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

  const questions = db.prepare('SELECT id, question, option_a, option_b, option_c, option_d, marks FROM quiz_questions WHERE quiz_id=? ORDER BY id ASC').all(quiz.id);
  
  // Don't send correct answers to students during quiz
  return res.json({ ...quiz, questions });
});

// ─── CREATE QUIZ (Teacher) ─────────────────────────────────────────────────────
router.post('/', authMiddleware, requireRole('teacher'), (req, res) => {
  const db = getDb();
  const { chapter_id, subject_id, title, description, duration_mins, questions } = req.body;

  if (!title || !questions?.length) {
    return res.status(400).json({ error: 'Title and at least one question required' });
  }

  const total_marks = questions.reduce((sum, q) => sum + (q.marks || 4), 0);

  const result = db.prepare(`
    INSERT INTO quizzes (chapter_id, subject_id, title, description, duration_mins, total_marks, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(chapter_id || null, subject_id || null, title, description || null, duration_mins || 15, total_marks, req.user.id);

  const quizId = result.lastInsertRowid;
  const insertQ = db.prepare(`
    INSERT INTO quiz_questions (quiz_id, question, option_a, option_b, option_c, option_d, correct_option, marks)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const q of questions) {
    insertQ.run(quizId, q.question, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_option.toUpperCase(), q.marks || 4);
  }

  const quiz = db.prepare('SELECT * FROM quizzes WHERE id=?').get(quizId);
  return res.status(201).json(quiz);
});

// ─── SUBMIT QUIZ ATTEMPT (Student) ────────────────────────────────────────────
router.post('/:id/submit', authMiddleware, requireRole('student'), (req, res) => {
  const db = getDb();
  const quizId = parseInt(req.params.id);
  const { answers, time_taken_secs } = req.body; // answers: { questionId: 'A'|'B'|'C'|'D' }

  const quiz = db.prepare('SELECT * FROM quizzes WHERE id=?').get(quizId);
  if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

  const questions = db.prepare('SELECT * FROM quiz_questions WHERE quiz_id=?').all(quizId);

  let correct = 0;
  let wrong = 0;
  let score = 0;

  for (const q of questions) {
    const userAnswer = answers?.[q.id];
    if (userAnswer) {
      if (userAnswer.toUpperCase() === q.correct_option) {
        correct++;
        score += q.marks;
      } else {
        wrong++;
        // Optional: negative marking could go here
      }
    }
  }

  const result = db.prepare(`
    INSERT INTO quiz_attempts (quiz_id, user_id, score, total_marks, correct_answers, wrong_answers, time_taken_secs, answers)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(quizId, req.user.id, score, quiz.total_marks, correct, wrong, time_taken_secs || null, JSON.stringify(answers));

  // Return results WITH correct answers now
  const questionsWithAnswers = questions.map(q => ({
    ...q,
    user_answer: answers?.[q.id] || null,
    is_correct: (answers?.[q.id] || '').toUpperCase() === q.correct_option,
  }));

  return res.json({
    attempt_id: result.lastInsertRowid,
    score,
    total_marks: quiz.total_marks,
    percentage: Math.round((score / quiz.total_marks) * 100),
    correct_answers: correct,
    wrong_answers: wrong,
    unanswered: questions.length - correct - wrong,
    questions: questionsWithAnswers,
  });
});

// ─── GET QUIZ RESULTS (Student's attempts) ────────────────────────────────────
router.get('/:id/results', authMiddleware, (req, res) => {
  const db = getDb();
  const quizId = parseInt(req.params.id);

  let attempts;
  if (req.user.role === 'student') {
    attempts = db.prepare(`
      SELECT qa.*, u.name as student_name
      FROM quiz_attempts qa JOIN users u ON qa.user_id=u.id
      WHERE qa.quiz_id=? AND qa.user_id=?
      ORDER BY qa.completed_at DESC
    `).all(quizId, req.user.id);
  } else {
    attempts = db.prepare(`
      SELECT qa.*, u.name as student_name, u.roll_number
      FROM quiz_attempts qa JOIN users u ON qa.user_id=u.id
      WHERE qa.quiz_id=?
      ORDER BY qa.score DESC
    `).all(quizId);
  }

  return res.json(attempts);
});

// ─── LEADERBOARD ──────────────────────────────────────────────────────────────
router.get('/:id/leaderboard', authMiddleware, (req, res) => {
  const db = getDb();
  const quizId = parseInt(req.params.id);

  const leaderboard = db.prepare(`
    SELECT u.name, u.roll_number, MAX(qa.score) as best_score, qa.total_marks,
           ROUND(MAX(qa.score) * 100.0 / qa.total_marks) as percentage
    FROM quiz_attempts qa JOIN users u ON qa.user_id=u.id
    WHERE qa.quiz_id=?
    GROUP BY qa.user_id
    ORDER BY best_score DESC
    LIMIT 20
  `).all(quizId);

  return res.json(leaderboard.map((r, i) => ({ ...r, rank: i + 1 })));
});

export default router;
