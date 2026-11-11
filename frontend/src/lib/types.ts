export type Role = 'student' | 'teacher' | 'parent';

export interface User {
  id: number;
  name: string;
  email?: string | null;
  mobile?: string | null;
  role: Role;
  class_grade?: string | null;
  stream?: string | null;
  roll_number?: string | null;
  school_name?: string | null;
  school_id?: number | null;
  board?: string | null;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface School {
  id: number;
  name: string;
  city: string;
  district: string;
  state: string;
  board: string;
}

export interface Subject {
  id: number;
  name: string;
  class_grade: string;
  board: string;
  stream: string | null;
  icon: string;
  color: string;
  chapter_count?: number;
  content_count?: number;
}

export interface Chapter {
  id: number;
  subject_id: number;
  title: string;
  chapter_number: number;
  description: string | null;
  content_count: number;
}

export interface Content {
  id: number;
  chapter_id: number;
  title: string;
  type: 'pdf' | 'video' | 'notes';
  url: string | null;
  filename: string | null;
  duration_mins: number | null;
  size_mb: number | null;
}

export interface QuizSummary {
  id: number;
  title: string;
  description: string | null;
  duration_mins: number;
  total_marks: number;
  subject_id: number | null;
  subject_name: string | null;
  chapter_title: string | null;
  question_count: number;
  created_by: number | null;
  last_attempt?: { id: number; score: number; total_marks: number; completed_at: number } | null;
}

export interface Question {
  id: number;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  marks: number;
}

export interface QuizDetail extends QuizSummary {
  questions: Question[];
}

export type Letter = 'A' | 'B' | 'C' | 'D';

export interface QuizResult {
  attempt_id: number;
  score: number;
  total_marks: number;
  percentage: number;
  correct_answers: number;
  wrong_answers: number;
  unanswered: number;
  questions: (Question & { correct_option: Letter; user_answer: Letter | null; is_correct: boolean })[];
}

export interface LeaderRow {
  rank: number;
  name: string;
  roll_number: string | null;
  best_score: number;
  total_marks: number;
  percentage: number;
}

export interface AttemptRow {
  id: number;
  student_name: string;
  roll_number?: string | null;
  score: number;
  total_marks: number;
  correct_answers: number;
  wrong_answers: number;
  time_taken_secs: number | null;
  completed_at: number;
}

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'holiday';

export interface AttendanceRecord {
  id: number;
  student_id: number;
  date: string;
  status: AttendanceStatus;
}

export interface AttendanceSummary {
  present: number;
  absent: number;
  total: number;
  percentage: number;
}

export interface AttendanceData {
  records: AttendanceRecord[];
  summary: AttendanceSummary;
}

export interface StudentLite {
  id: number;
  name: string;
  roll_number: string | null;
  class_grade: string | null;
}

export interface LowAttendanceRow extends StudentLite {
  present_days: number;
  total_days: number;
  percentage: number | null;
}

export interface Scholarship {
  id: number;
  title: string;
  amount: string;
  provider: string;
  deadline: string;
  eligibility: string | null;
  category: string | null;
  description: string | null;
  apply_url: string | null;
  applied?: boolean;
}

export interface Competition {
  id: number;
  title: string;
  prize: string | null;
  organizer: string | null;
  event_date: string | null;
  registration_deadline: string | null;
  description: string | null;
  apply_url: string | null;
  level: string | null;
}

export interface Child {
  id: number;
  name: string;
  class_grade: string | null;
  roll_number: string | null;
  school_name: string | null;
  board: string | null;
}

export interface Performance {
  quiz_attempts: (AttemptRow & { quiz_title: string; subject_name: string | null })[];
  attendance: { present: number; total: number; percentage: number };
  scholarship_applications: number;
}
