import { useState } from 'react';
import { Link } from 'react-router';
import { ClipboardList, Plus, Trophy, Users } from 'lucide-react';
import { useUser } from '../lib/auth';
import { useFetch } from '../lib/useFetch';
import { formatDate, pastelFor, plural } from '../lib/format';
import type { AttemptRow, Child, LeaderRow, Performance, QuizSummary } from '../lib/types';
import { Empty, ErrorBox, Loader, Modal, Field } from '../components/ui';

const CLASSES = ['', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];

export default function Quizzes() {
  const user = useUser();
  if (user.role === 'parent') return <ParentQuizzes />;
  return <QuizList />;
}

function QuizList() {
  const user = useUser();
  const isTeacher = user.role === 'teacher';
  const [grade, setGrade] = useState(isTeacher ? '' : user.class_grade || '');
  const { data, loading, error, reload } = useFetch<QuizSummary[]>(`/quizzes${grade ? `?class_grade=${grade}` : ''}`);
  const [board, setBoard] = useState<QuizSummary | null>(null);
  const [results, setResults] = useState<QuizSummary | null>(null);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Quizzes</h1>
          <p>{isTeacher ? 'See how your students scored, or write a new quiz.' : 'Short chapter tests. Your score is saved so you can see your progress.'}</p>
        </div>
        <div className="row wrap" style={{ alignItems: 'flex-end' }}>
          <Field label="Class" style={{ minWidth: 150 }}>
            <select className="select" value={grade} onChange={(e) => setGrade(e.target.value)}>
              {CLASSES.map((c) => (
                <option key={c} value={c}>
                  {c ? `Class ${c}` : 'All classes'}
                </option>
              ))}
            </select>
          </Field>
          {isTeacher && (
            <Link to="/quizzes/new" className="btn">
              <Plus size={18} />
              New quiz
            </Link>
          )}
        </div>
      </div>

      {loading ? (
        <Loader />
      ) : error ? (
        <ErrorBox message={error} onRetry={reload} />
      ) : !data?.length ? (
        <Empty emoji="📝" title="No quizzes here yet">
          {isTeacher ? 'Create the first one for this class.' : 'Check back after your teacher adds one.'}
        </Empty>
      ) : (
        <div className="grid-3">
          {data.map((q) => {
            const tone = pastelFor(q.subject_name ?? q.id);
            const pct = q.last_attempt ? Math.round((q.last_attempt.score / q.last_attempt.total_marks) * 100) : null;
            return (
              <div key={q.id} className={`ticket t-${tone}`}>
                <div className="row between">
                  <span className="chip">{q.subject_name ?? 'General'}</span>
                  {pct !== null && <span className={`chip t-${pct >= 60 ? 'mint' : 'peach'}`}>Best {pct}%</span>}
                </div>
                <h3>{q.title}</h3>
                {q.chapter_title && <p className="small muted">Chapter: {q.chapter_title}</p>}
                <p className="small muted">
                  {plural(q.question_count, 'question')}, {q.duration_mins} min, {q.total_marks} marks
                </p>
                <div className="foot">
                  <button className="btn ghost sm" onClick={() => setBoard(q)}>
                    <Trophy size={15} />
                    Leaderboard
                  </button>
                  {isTeacher ? (
                    <button className="btn sm" onClick={() => setResults(q)}>
                      <Users size={15} />
                      Results
                    </button>
                  ) : (
                    <Link to={`/quizzes/${q.id}`} className="btn sm">
                      {q.last_attempt ? 'Try again' : 'Start quiz'}
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {board && <LeaderboardModal quiz={board} onClose={() => setBoard(null)} />}
      {results && <ResultsModal quiz={results} onClose={() => setResults(null)} />}
    </>
  );
}

export function LeaderboardModal({ quiz, onClose }: { quiz: QuizSummary; onClose: () => void }) {
  const { data, loading, error } = useFetch<LeaderRow[]>(`/quizzes/${quiz.id}/leaderboard`);
  return (
    <Modal title="Leaderboard" subtitle={quiz.title} onClose={onClose}>
      {loading ? (
        <Loader />
      ) : error ? (
        <ErrorBox message={error} />
      ) : !data?.length ? (
        <Empty emoji="🏁" title="No one has taken this yet">
          Be the first on the board.
        </Empty>
      ) : (
        <ul className="list">
          {data.map((r) => (
            <li key={`${r.rank}-${r.name}`}>
              <span className={`medal${r.rank <= 3 ? ` r${r.rank}` : ''}`}>{r.rank}</span>
              <div className="grow">
                <div className="title">{r.name}</div>
                {r.roll_number && <div className="small faint">Roll {r.roll_number}</div>}
              </div>
              <strong>
                {r.best_score}/{r.total_marks}
              </strong>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}

function ResultsModal({ quiz, onClose }: { quiz: QuizSummary; onClose: () => void }) {
  const { data, loading, error } = useFetch<AttemptRow[]>(`/quizzes/${quiz.id}/results`);
  const avg = data?.length ? Math.round(data.reduce((s, a) => s + (a.score / a.total_marks) * 100, 0) / data.length) : 0;
  return (
    <Modal title="Student results" subtitle={quiz.title} onClose={onClose} wide>
      {loading ? (
        <Loader />
      ) : error ? (
        <ErrorBox message={error} />
      ) : !data?.length ? (
        <Empty emoji="⏳" title="No attempts yet" />
      ) : (
        <>
          <p className="muted" style={{ marginBottom: 12 }}>
            {plural(data.length, 'attempt')}, class average {avg}%
          </p>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Roll</th>
                  <th>Score</th>
                  <th>Correct</th>
                  <th>Time</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {data.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <strong>{a.student_name}</strong>
                    </td>
                    <td>{a.roll_number ?? ''}</td>
                    <td>
                      <span className={`chip t-${a.score / a.total_marks >= 0.6 ? 'mint' : 'peach'}`}>
                        {a.score}/{a.total_marks}
                      </span>
                    </td>
                    <td>{a.correct_answers}</td>
                    <td>{a.time_taken_secs ? `${Math.floor(a.time_taken_secs / 60)}m ${a.time_taken_secs % 60}s` : ''}</td>
                    <td>{formatDate(a.completed_at, { day: 'numeric', month: 'short' })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Modal>
  );
}

function ParentQuizzes() {
  const kids = useFetch<Child[]>('/users/my-children');
  const [childId, setChildId] = useState<number | null>(null);
  const active = childId ?? kids.data?.[0]?.id ?? null;
  const perf = useFetch<Performance>(active ? `/users/${active}/performance` : null);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Quiz results</h1>
          <p>Every quiz your child has taken, newest first.</p>
        </div>
        {kids.data && kids.data.length > 1 && (
          <Field label="Child" style={{ minWidth: 200 }}>
            <select className="select" value={active ?? ''} onChange={(e) => setChildId(Number(e.target.value))}>
              {kids.data.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.name}
                </option>
              ))}
            </select>
          </Field>
        )}
      </div>
      {kids.loading || perf.loading ? (
        <Loader />
      ) : kids.error ? (
        <ErrorBox message={kids.error} />
      ) : !active ? (
        <Empty emoji="👨‍👩‍👧" title="No children linked yet">
          Link your child from the Profile page.
        </Empty>
      ) : perf.error ? (
        <ErrorBox message={perf.error} onRetry={perf.reload} />
      ) : !perf.data?.quiz_attempts.length ? (
        <Empty emoji="📝" title="No quizzes taken yet" />
      ) : (
        <div className="panel">
          <ul className="list">
            {perf.data.quiz_attempts.map((a) => (
              <li key={a.id}>
                <span className={`icon-blob t-${pastelFor(a.subject_name ?? a.quiz_title)}`}>
                  <ClipboardList size={20} />
                </span>
                <div className="grow">
                  <div className="title">{a.quiz_title}</div>
                  <div className="small muted">
                    {a.subject_name}, {formatDate(a.completed_at)}, {a.correct_answers} correct
                  </div>
                </div>
                <span className={`chip t-${a.score / a.total_marks >= 0.6 ? 'mint' : 'peach'}`}>
                  {a.score}/{a.total_marks}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
