import { Link } from 'react-router';
import { CalendarCheck, ClipboardList, Plus, Upload, Award } from 'lucide-react';
import { useUser } from '../lib/auth';
import { useFetch } from '../lib/useFetch';
import { daysUntil, firstName, formatDate, greeting, pastelFor, plural } from '../lib/format';
import type {
  AttendanceData,
  Child,
  LowAttendanceRow,
  Performance,
  QuizSummary,
  Scholarship,
  StudentLite,
  Subject,
} from '../lib/types';
import { Empty, ErrorBox, Loader, Ring } from '../components/ui';
import { SubjectCover } from './Courses';

export default function Dashboard() {
  const user = useUser();
  if (user.role === 'teacher') return <TeacherHome />;
  if (user.role === 'parent') return <ParentHome />;
  return <StudentHome />;
}

function Notebook({ title, line, stats }: { title: string; line: string; stats: { value: string; label: string }[] }) {
  return (
    <section className="notebook" aria-label="Summary">
      <div className="tape" aria-hidden />
      <h1 className="notebook-greeting">{title}</h1>
      <p className="notebook-line">{line}</p>
      <div className="notebook-stats">
        {stats.map((s) => (
          <div className="notebook-stat" key={s.label}>
            <strong>{s.value}</strong>
            <span>{s.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─── Student ───────────────────────────────────────────────── */

function StudentHome() {
  const user = useUser();
  const att = useFetch<AttendanceData>('/attendance/my');
  const perf = useFetch<Performance>(`/users/${user.id}/performance`);
  const subjects = useFetch<Subject[]>(
    `/courses/subjects?class_grade=${user.class_grade ?? ''}${user.stream ? `&stream=${encodeURIComponent(user.stream)}` : ''}`
  );
  const quizzes = useFetch<QuizSummary[]>(`/quizzes?class_grade=${user.class_grade ?? ''}`);
  const scholarships = useFetch<Scholarship[]>('/scholarships');

  const attempts = perf.data?.quiz_attempts ?? [];
  const avg = attempts.length
    ? Math.round(attempts.reduce((s, a) => s + (a.score / a.total_marks) * 100, 0) / attempts.length)
    : null;
  const pending = (quizzes.data ?? []).filter((q) => !q.last_attempt);
  const soon = (scholarships.data ?? []).filter((s) => daysUntil(s.deadline) >= 0).slice(0, 3);

  return (
    <>
      <Notebook
        title={`${greeting()}, ${firstName(user.name)}!`}
        line={
          pending.length
            ? `You have ${plural(pending.length, 'quiz', 'quizzes')} waiting. A few minutes today keeps exam stress away.`
            : 'All caught up on quizzes. Pick a chapter and keep going.'
        }
        stats={[
          { value: !att.data ? '…' : att.data.summary.total ? `${att.data.summary.percentage}%` : 'None yet', label: 'attendance' },
          { value: String(attempts.length), label: attempts.length === 1 ? 'quiz taken' : 'quizzes taken' },
          { value: avg === null ? 'None yet' : `${avg}%`, label: 'average score' },
        ]}
      />

      <div className="section">
        <div className="section-head">
          <h2>Your notebooks</h2>
          <Link to="/courses">All subjects</Link>
        </div>
        {subjects.loading ? (
          <Loader />
        ) : subjects.error ? (
          <ErrorBox message={subjects.error} onRetry={subjects.reload} />
        ) : subjects.data?.length ? (
          <div className="covers">
            {subjects.data.slice(0, 4).map((s) => (
              <SubjectCover key={s.id} subject={s} name={user.name} />
            ))}
          </div>
        ) : (
          <Empty emoji="📚" title="No subjects for your class yet">
            Ask your teacher to add lessons.
          </Empty>
        )}
      </div>

      <div className="section dash-grid">
        <div className="panel">
          <div className="section-head">
            <h3>Quizzes to try</h3>
            <Link to="/quizzes">See all</Link>
          </div>
          {quizzes.loading ? (
            <Loader />
          ) : pending.length ? (
            <ul className="list">
              {pending.slice(0, 4).map((q) => (
                <li key={q.id}>
                  <span className={`icon-blob t-${pastelFor(q.subject_name ?? q.id)}`}>
                    <ClipboardList size={20} />
                  </span>
                  <div className="grow">
                    <div className="title">{q.title}</div>
                    <div className="small muted">
                      {plural(q.question_count, 'question')}, {q.duration_mins} min
                    </div>
                  </div>
                  <Link className="btn sm" to={`/quizzes/${q.id}`}>
                    Start
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <Empty emoji="🎉" title="Nothing pending">
              You have tried every quiz for your class.
            </Empty>
          )}
        </div>

        <div className="panel">
          <div className="section-head">
            <h3>Closing soon</h3>
            <Link to="/opportunities">Scholarships</Link>
          </div>
          {scholarships.loading ? (
            <Loader />
          ) : soon.length ? (
            <ul className="list">
              {soon.map((s) => (
                <li key={s.id}>
                  <span className={`icon-blob t-${pastelFor(s.category ?? s.id)}`}>
                    <Award size={20} />
                  </span>
                  <div className="grow">
                    <div className="title">{s.title}</div>
                    <div className="small muted">
                      {s.amount}, closes {formatDate(s.deadline, { day: 'numeric', month: 'short' })}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">No open scholarships right now.</p>
          )}
        </div>
      </div>
    </>
  );
}

/* ─── Teacher ───────────────────────────────────────────────── */

function TeacherHome() {
  const user = useUser();
  const students = useFetch<StudentLite[]>('/attendance/students');
  const low = useFetch<LowAttendanceRow[]>('/attendance/low-attendance?threshold=75');
  const quizzes = useFetch<QuizSummary[]>('/quizzes');

  const mine = (quizzes.data ?? []).filter((q) => q.created_by === user.id);

  return (
    <>
      <Notebook
        title={`${greeting()}, ${firstName(user.name)}`}
        line="Mark today's attendance, share a chapter's notes, or set a quick quiz for your class."
        stats={[
          { value: students.data ? String(students.data.length) : '…', label: 'students' },
          { value: low.data ? String(low.data.length) : '…', label: 'below 75% attendance' },
          { value: quizzes.data ? String(quizzes.data.length) : '…', label: quizzes.data?.length === 1 ? 'quiz live' : 'quizzes live' },
        ]}
      />

      <div className="section grid-3">
        <Link to="/attendance" className="panel-tinted t-mint" style={{ textDecoration: 'none' }}>
          <CalendarCheck size={26} />
          <h3 style={{ marginTop: 10 }}>Take attendance</h3>
          <p className="small muted">Mark present, late or absent for today.</p>
        </Link>
        <Link to="/courses" className="panel-tinted t-sky" style={{ textDecoration: 'none' }}>
          <Upload size={26} />
          <h3 style={{ marginTop: 10 }}>Share lessons</h3>
          <p className="small muted">Upload a PDF or add a video to a chapter.</p>
        </Link>
        <Link to="/quizzes/new" className="panel-tinted t-butter" style={{ textDecoration: 'none' }}>
          <Plus size={26} />
          <h3 style={{ marginTop: 10 }}>Create a quiz</h3>
          <p className="small muted">Write questions and publish in minutes.</p>
        </Link>
      </div>

      <div className="section dash-grid">
        <div className="panel">
          <div className="section-head">
            <h3>Needs attention</h3>
            <Link to="/attendance">Attendance</Link>
          </div>
          {low.loading ? (
            <Loader />
          ) : low.error ? (
            <ErrorBox message={low.error} onRetry={low.reload} />
          ) : low.data?.length ? (
            <ul className="list">
              {low.data.map((s) => (
                <li key={s.id}>
                  <div className="grow">
                    <div className="title">{s.name}</div>
                    <div className="small muted">
                      Class {s.class_grade ?? '?'}, roll {s.roll_number ?? '?'}, {s.present_days}/{s.total_days} days
                    </div>
                  </div>
                  <span className="chip t-rose">{s.percentage ?? 0}%</span>
                </li>
              ))}
            </ul>
          ) : (
            <Empty emoji="🌟" title="Everyone is above 75%" />
          )}
        </div>

        <div className="panel">
          <div className="section-head">
            <h3>Your quizzes</h3>
            <Link to="/quizzes">Results</Link>
          </div>
          {quizzes.loading ? (
            <Loader />
          ) : mine.length ? (
            <ul className="list">
              {mine.slice(0, 5).map((q) => (
                <li key={q.id}>
                  <div className="grow">
                    <div className="title">{q.title}</div>
                    <div className="small muted">{plural(q.question_count, 'question')}</div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <Empty emoji="📝" title="No quizzes from you yet">
              <Link to="/quizzes/new" className="btn sm soft" style={{ marginTop: 10 }}>
                Create a quiz
              </Link>
            </Empty>
          )}
        </div>
      </div>
    </>
  );
}

/* ─── Parent ────────────────────────────────────────────────── */

function ParentHome() {
  const user = useUser();
  const kids = useFetch<Child[]>('/users/my-children');

  return (
    <>
      <Notebook
        title={`${greeting()}, ${firstName(user.name)}`}
        line="See how your children are doing at school: attendance, quiz scores and scholarships."
        stats={[{ value: kids.data ? String(kids.data.length) : '…', label: kids.data?.length === 1 ? 'child linked' : 'children linked' }]}
      />
      <div className="section">
        <div className="section-head">
          <h2>Your children</h2>
          <Link to="/profile">Link a child</Link>
        </div>
        {kids.loading ? (
          <Loader />
        ) : kids.error ? (
          <ErrorBox message={kids.error} onRetry={kids.reload} />
        ) : kids.data?.length ? (
          <div className="stack">
            {kids.data.map((c) => (
              <ChildCard key={c.id} child={c} />
            ))}
          </div>
        ) : (
          <Empty emoji="👨‍👩‍👧" title="No children linked yet">
            <p>Link your child with their roll number from the Profile page.</p>
            <Link to="/profile" className="btn sm soft" style={{ marginTop: 10 }}>
              Link a child
            </Link>
          </Empty>
        )}
      </div>
    </>
  );
}

function ChildCard({ child }: { child: Child }) {
  const perf = useFetch<Performance>(`/users/${child.id}/performance`);
  const attempts = perf.data?.quiz_attempts ?? [];
  return (
    <div className="panel">
      <div className="row wrap" style={{ gap: 24, alignItems: 'flex-start' }}>
        <Ring value={perf.data?.attendance.percentage ?? 0} label="attendance" size={116} />
        <div className="spacer" style={{ minWidth: 220 }}>
          <h3 style={{ fontSize: '1.35rem' }}>{child.name}</h3>
          <p className="muted small">
            Class {child.class_grade ?? '?'}
            {child.roll_number && `, roll ${child.roll_number}`}
            {child.school_name && `, ${child.school_name}`}
          </p>
          {perf.loading ? (
            <Loader />
          ) : attempts.length ? (
            <ul className="list" style={{ marginTop: 8 }}>
              {attempts.slice(0, 3).map((a) => (
                <li key={a.id}>
                  <div className="grow">
                    <div className="title">{a.quiz_title}</div>
                    <div className="small muted">
                      {a.subject_name}, {formatDate(a.completed_at)}
                    </div>
                  </div>
                  <span className={`chip t-${a.score / a.total_marks >= 0.6 ? 'mint' : 'peach'}`}>
                    {a.score}/{a.total_marks}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted small" style={{ marginTop: 10 }}>
              No quizzes taken yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
