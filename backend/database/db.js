import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const DB_PATH = process.env.DB_PATH || join(__dirname, 'edu.db');

let db;

export function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema();
  }
  return db;
}

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE,
      mobile TEXT UNIQUE,
      password_hash TEXT,
      role TEXT NOT NULL DEFAULT 'student',
      class_grade TEXT,
      stream TEXT,
      roll_number TEXT,
      school_id INTEGER,
      school_name TEXT,
      board TEXT DEFAULT 'CBSE',
      otp TEXT,
      otp_expires INTEGER,
      created_at INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (school_id) REFERENCES schools(id)
    );

    CREATE TABLE IF NOT EXISTS schools (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      city TEXT,
      district TEXT,
      state TEXT NOT NULL,
      board TEXT,
      pincode TEXT,
      udise_code TEXT UNIQUE
    );

    CREATE TABLE IF NOT EXISTS subjects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      class_grade TEXT NOT NULL,
      board TEXT NOT NULL DEFAULT 'CBSE',
      stream TEXT,
      icon TEXT DEFAULT '📚',
      color TEXT DEFAULT '#6366F1'
    );

    CREATE TABLE IF NOT EXISTS chapters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subject_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      chapter_number INTEGER NOT NULL,
      description TEXT,
      FOREIGN KEY (subject_id) REFERENCES subjects(id)
    );

    CREATE TABLE IF NOT EXISTS content (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chapter_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('pdf', 'video', 'notes')),
      url TEXT,
      filename TEXT,
      file_path TEXT,
      duration_mins INTEGER,
      size_mb REAL,
      created_at INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (chapter_id) REFERENCES chapters(id)
    );

    CREATE TABLE IF NOT EXISTS quizzes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chapter_id INTEGER,
      subject_id INTEGER,
      title TEXT NOT NULL,
      description TEXT,
      duration_mins INTEGER DEFAULT 15,
      total_marks INTEGER DEFAULT 100,
      created_by INTEGER,
      is_active INTEGER DEFAULT 1,
      created_at INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (chapter_id) REFERENCES chapters(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS quiz_questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quiz_id INTEGER NOT NULL,
      question TEXT NOT NULL,
      option_a TEXT NOT NULL,
      option_b TEXT NOT NULL,
      option_c TEXT NOT NULL,
      option_d TEXT NOT NULL,
      correct_option TEXT NOT NULL CHECK(correct_option IN ('A','B','C','D')),
      marks INTEGER DEFAULT 4,
      FOREIGN KEY (quiz_id) REFERENCES quizzes(id)
    );

    CREATE TABLE IF NOT EXISTS quiz_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quiz_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      score INTEGER DEFAULT 0,
      total_marks INTEGER DEFAULT 100,
      correct_answers INTEGER DEFAULT 0,
      wrong_answers INTEGER DEFAULT 0,
      time_taken_secs INTEGER,
      answers TEXT,
      completed_at INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (quiz_id) REFERENCES quizzes(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      teacher_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('present','absent','holiday','late')),
      class_grade TEXT,
      school_id INTEGER,
      remarks TEXT,
      created_at INTEGER DEFAULT (unixepoch()),
      UNIQUE(student_id, date),
      FOREIGN KEY (student_id) REFERENCES users(id),
      FOREIGN KEY (teacher_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS scholarships (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      amount TEXT NOT NULL,
      provider TEXT NOT NULL,
      deadline TEXT NOT NULL,
      eligibility TEXT,
      category TEXT,
      description TEXT,
      apply_url TEXT,
      is_active INTEGER DEFAULT 1,
      created_at INTEGER DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS scholarship_applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      scholarship_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      status TEXT DEFAULT 'applied',
      applied_at INTEGER DEFAULT (unixepoch()),
      UNIQUE(scholarship_id, user_id),
      FOREIGN KEY (scholarship_id) REFERENCES scholarships(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS competitions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      prize TEXT,
      organizer TEXT,
      event_date TEXT,
      registration_deadline TEXT,
      description TEXT,
      apply_url TEXT,
      level TEXT,
      is_active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS parent_child (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      parent_id INTEGER NOT NULL,
      child_id INTEGER NOT NULL,
      UNIQUE(parent_id, child_id),
      FOREIGN KEY (parent_id) REFERENCES users(id),
      FOREIGN KEY (child_id) REFERENCES users(id)
    );
  `);
}

export function closeDb() {
  if (db) { db.close(); db = undefined; }
}

export default getDb;
