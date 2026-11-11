import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { api } from '../lib/api';
import { useUser } from '../lib/auth';
import { useFetch } from '../lib/useFetch';
import { toISODate } from '../lib/format';
import type { AttendanceData, AttendanceRecord, AttendanceStatus, Child, LowAttendanceRow, StudentLite } from '../lib/types';
import { Empty, ErrorBox, Loader, Ring, useToast, Field } from '../components/ui';

export default function Attendance() {
  const user = useUser();
  if (user.role === 'teacher') return <TeacherAttendance />;
  if (user.role === 'parent') return <ParentAttendance />;
  return <StudentAttendance />;
}

/* ─── Shared: month calendar ───────────────────────────────── */

const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function MonthCalendar({ records }: { records: AttendanceRecord[] }) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const byDate = useMemo(() => new Map(records.map((r) => [r.date, r.status])), [records]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const offset = (new Date(year, month, 1).getDay() + 6) % 7; // Monday first
  const today = toISODate(new Date());
  const monthCount = { present: 0, absent: 0, late: 0 };
  for (let d = 1; d <= daysInMonth; d++) {
    const s = byDate.get(toISODate(new Date(year, month, d)));
    if (s === 'present' || s === 'absent' || s === 'late') monthCount[s]++;
  }

  return (
    <div className="panel">
      <div className="row between" style={{ marginBottom: 14 }}>
        <button className="icon-btn" onClick={() => setCursor(new Date(year, month - 1, 1))} aria-label="Previous month">
          <ChevronLeft size={18} />
        </button>
        <h3>{cursor.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</h3>
        <button className="icon-btn" onClick={() => setCursor(new Date(year, month + 1, 1))} aria-label="Next month">
          <ChevronRight size={18} />
        </button>
      </div>
      <div className="cal">
        {DOW.map((d) => (
          <div className="dow" key={d}>
            {d}
          </div>
        ))}
        {Array.from({ length: offset }).map((_, i) => (
          <div className="day blank" key={`b${i}`} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const iso = toISODate(new Date(year, month, i + 1));
          const status = byDate.get(iso);
          return (
            <div key={iso} className={`day ${status ?? ''}${iso === today ? ' today' : ''}`} title={status ? `${iso}: ${status}` : iso}>
              {i + 1}
            </div>
          );
        })}
      </div>
      <div className="legend">
        <span><i style={{ background: 'var(--mint)' }} />Present ({monthCount.present})</span>
        <span><i style={{ background: 'var(--butter)' }} />Late ({monthCount.late})</span>
        <span><i style={{ background: 'var(--rose)' }} />Absent ({monthCount.absent})</span>
      </div>
    </div>
  );
}

function SummaryPanel({ data }: { data: AttendanceData }) {
  const { summary } = data;
  const tone = summary.percentage >= 75 ? 'var(--mint-deep)' : 'var(--rose-deep)';
  return (
    <div className="panel">
      <div className="row wrap" style={{ gap: 24 }}>
        <Ring value={summary.percentage} size={130} tone={tone} label="present" />
        <div className="stack" style={{ gap: 6 }}>
          <p>
            <strong>{summary.present}</strong> <span className="muted">{summary.present === 1 ? 'day' : 'days'} present</span>
          </p>
          <p>
            <strong>{summary.absent}</strong> <span className="muted">{summary.absent === 1 ? 'day' : 'days'} absent</span>
          </p>
          <p>
            <strong>{summary.total}</strong> <span className="muted">school days recorded</span>
          </p>
          {summary.percentage < 75 && (
            <p className="chip t-rose" style={{ marginTop: 6, whiteSpace: 'normal' }}>
              Below the 75% needed for exams
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Student ───────────────────────────────────────────────── */

function StudentAttendance() {
  const { data, loading, error, reload } = useFetch<AttendanceData>('/attendance/my');
  return (
    <>
      <div className="page-head">
        <div>
          <h1>My attendance</h1>
          <p>Marked daily by your teacher. Aim for at least 75% to sit your exams.</p>
        </div>
      </div>
      {loading ? (
        <Loader />
      ) : error ? (
        <ErrorBox message={error} onRetry={reload} />
      ) : data && data.records.length ? (
        <div className="dash-grid">
          <MonthCalendar records={data.records} />
          <SummaryPanel data={data} />
        </div>
      ) : (
        <Empty emoji="🗓️" title="No attendance recorded yet" />
      )}
    </>
  );
}

/* ─── Parent ────────────────────────────────────────────────── */

function ParentAttendance() {
  const kids = useFetch<Child[]>('/users/my-children');
  const [childId, setChildId] = useState<number | null>(null);
  const active = childId ?? kids.data?.[0]?.id ?? null;
  const att = useFetch<AttendanceData>(active ? `/attendance/child/${active}` : null);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Attendance</h1>
          <p>Your child's last 60 school days.</p>
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
      {kids.loading || att.loading ? (
        <Loader />
      ) : kids.error ? (
        <ErrorBox message={kids.error} />
      ) : !active ? (
        <Empty emoji="👨‍👩‍👧" title="No children linked yet">
          Link your child from the Profile page.
        </Empty>
      ) : att.error ? (
        <ErrorBox message={att.error} onRetry={att.reload} />
      ) : att.data ? (
        <div className="dash-grid">
          <MonthCalendar records={att.data.records} />
          <SummaryPanel data={att.data} />
        </div>
      ) : null}
    </>
  );
}

/* ─── Teacher ───────────────────────────────────────────────── */

const CLASSES = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
const STATUSES: AttendanceStatus[] = ['present', 'late', 'absent'];

function TeacherAttendance() {
  const [tab, setTab] = useState<'mark' | 'low'>('mark');
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Attendance</h1>
          <p>Mark your class for any day, and keep an eye on students falling behind.</p>
        </div>
        <div className="segmented" role="group" aria-label="View">
          <button aria-pressed={tab === 'mark'} onClick={() => setTab('mark')}>
            Mark attendance
          </button>
          <button aria-pressed={tab === 'low'} onClick={() => setTab('low')}>
            Below 75%
          </button>
        </div>
      </div>
      {tab === 'mark' ? <MarkAttendance /> : <LowAttendance />}
    </>
  );
}

function MarkAttendance() {
  const [date, setDate] = useState(() => toISODate(new Date()));
  const [grade, setGrade] = useState('10');
  const students = useFetch<StudentLite[]>(`/attendance/students?class_grade=${grade}`);
  const existing = useFetch<(AttendanceRecord & { student_name: string })[]>(`/attendance/class?date=${date}&class_grade=${grade}`);
  const [marks, setMarks] = useState<Record<number, AttendanceStatus>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, showToast] = useToast();

  // Prefill from what was already saved for that day; default everyone to present
  useEffect(() => {
    if (!students.data) return;
    const saved = new Map((existing.data ?? []).map((r) => [r.student_id, r.status]));
    const next: Record<number, AttendanceStatus> = {};
    students.data.forEach((s) => (next[s.id] = saved.get(s.id) ?? 'present'));
    setMarks(next);
  }, [students.data, existing.data]);

  const counts = Object.values(marks).reduce(
    (acc, s) => ({ ...acc, [s]: (acc[s] ?? 0) + 1 }),
    {} as Record<string, number>
  );
  const alreadySaved = (existing.data?.length ?? 0) > 0;

  const save = async () => {
    setError('');
    setSaving(true);
    try {
      await api.post('/attendance/mark', {
        date,
        class_grade: grade,
        attendance: Object.entries(marks).map(([student_id, status]) => ({ student_id: Number(student_id), status })),
      });
      showToast(`Attendance saved for ${new Date(`${date}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`);
      existing.reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="panel">
      <div className="row wrap" style={{ alignItems: 'flex-end', marginBottom: 12 }}>
        <Field label="Date">
          <input className="input" type="date" value={date} max={toISODate(new Date())} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Class" style={{ minWidth: 140 }}>
          <select className="select" value={grade} onChange={(e) => setGrade(e.target.value)}>
            {CLASSES.map((c) => (
              <option key={c} value={c}>
                Class {c}
              </option>
            ))}
          </select>
        </Field>
        <span className="spacer" />
        {students.data?.length ? (
          <button
            className="btn ghost sm"
            onClick={() => setMarks(Object.fromEntries(students.data!.map((s) => [s.id, 'present' as AttendanceStatus])))}
          >
            Mark all present
          </button>
        ) : null}
      </div>

      {alreadySaved && (
        <div className="alert info" style={{ marginBottom: 10 }}>
          Already saved for this day. Change anything and save again to update.
        </div>
      )}

      {students.loading || existing.loading ? (
        <Loader />
      ) : students.error ? (
        <ErrorBox message={students.error} onRetry={students.reload} />
      ) : !students.data?.length ? (
        <Empty emoji="🪑" title={`No students in class ${grade}`}>
          Students appear here after they sign up with this class.
        </Empty>
      ) : (
        <>
          {students.data.map((s) => (
            <div className="roll" key={s.id}>
              <span className="chip">{s.roll_number ?? '?'}</span>
              <strong className="spacer">{s.name}</strong>
              <div className="status-pick" role="group" aria-label={`Attendance for ${s.name}`}>
                {STATUSES.map((st) => (
                  <button key={st} className={st} aria-pressed={marks[s.id] === st} onClick={() => setMarks((m) => ({ ...m, [s.id]: st }))}>
                    {st[0].toUpperCase() + st.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          ))}
          {error && <div style={{ marginTop: 12 }}><ErrorBox message={error} /></div>}
          <div className="row wrap" style={{ marginTop: 18 }}>
            <span className="muted small">
              {counts.present ?? 0} present, {counts.late ?? 0} late, {counts.absent ?? 0} absent
            </span>
            <span className="spacer" />
            <button className="btn" onClick={save} disabled={saving}>
              {saving && <Loader2 size={18} className="spin" />}Save attendance
            </button>
          </div>
        </>
      )}
      {toast}
    </div>
  );
}

function LowAttendance() {
  const [threshold, setThreshold] = useState(75);
  const { data, loading, error, reload } = useFetch<LowAttendanceRow[]>(`/attendance/low-attendance?threshold=${threshold}`);
  return (
    <div className="panel">
      <div className="row wrap" style={{ marginBottom: 10 }}>
        <span className="muted">Show students below</span>
        <div className="segmented" role="group" aria-label="Threshold">
          {[60, 75, 85].map((t) => (
            <button key={t} aria-pressed={threshold === t} onClick={() => setThreshold(t)}>
              {t}%
            </button>
          ))}
        </div>
      </div>
      {loading ? (
        <Loader />
      ) : error ? (
        <ErrorBox message={error} onRetry={reload} />
      ) : !data?.length ? (
        <Empty emoji="🌟" title={`Everyone is at ${threshold}% or above`} />
      ) : (
        <ul className="list">
          {data.map((s) => (
            <li key={s.id}>
              <div className="grow">
                <div className="title">{s.name}</div>
                <div className="small muted">
                  Class {s.class_grade ?? '?'}, roll {s.roll_number ?? '?'}, present {s.present_days} of {s.total_days} days
                </div>
                <div className="bar t-rose" style={{ marginTop: 8, maxWidth: 320 }}>
                  <i style={{ width: `${s.percentage ?? 0}%` }} />
                </div>
              </div>
              <span className="chip t-rose">{s.total_days ? `${s.percentage}%` : 'No records'}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
