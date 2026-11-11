import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import { ArrowLeft, Loader2, Plus, Trash2 } from 'lucide-react';
import { api } from '../lib/api';
import { useUser } from '../lib/auth';
import { useFetch } from '../lib/useFetch';
import type { Chapter, Letter, Subject } from '../lib/types';
import { ErrorBox, Field } from '../components/ui';

const CLASSES = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
const LETTERS: Letter[] = ['A', 'B', 'C', 'D'];

interface Draft {
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: Letter;
  marks: number;
}
const blank = (): Draft => ({ question: '', option_a: '', option_b: '', option_c: '', option_d: '', correct_option: 'A', marks: 4 });

export default function QuizCreate() {
  const user = useUser();
  const navigate = useNavigate();
  const [grade, setGrade] = useState('10');
  const [subjectId, setSubjectId] = useState('');
  const [chapterId, setChapterId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState('15');
  const [questions, setQuestions] = useState<Draft[]>([blank()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const subjects = useFetch<Subject[]>(`/courses/subjects?class_grade=${grade}`);
  const chapters = useFetch<{ subject: Subject; chapters: Chapter[] }>(subjectId ? `/courses/chapters/${subjectId}` : null);

  if (user.role !== 'teacher') return <Navigate to="/quizzes" replace />;

  const update = (i: number, patch: Partial<Draft>) => setQuestions((qs) => qs.map((q, j) => (j === i ? { ...q, ...patch } : q)));
  const total = questions.reduce((s, q) => s + (Number(q.marks) || 0), 0);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!subjectId) return setError('Choose a subject.');
    if (!title.trim()) return setError('Give the quiz a title.');
    const bad = questions.findIndex((q) => !q.question.trim() || LETTERS.some((l) => !q[`option_${l.toLowerCase()}` as keyof Draft]));
    if (bad >= 0) return setError(`Question ${bad + 1} needs the question text and all four options.`);
    setSaving(true);
    try {
      await api.post('/quizzes', {
        subject_id: Number(subjectId),
        chapter_id: chapterId ? Number(chapterId) : null,
        title: title.trim(),
        description: description.trim() || null,
        duration_mins: Number(duration) || 15,
        questions: questions.map((q) => ({ ...q, marks: Number(q.marks) || 4 })),
      });
      navigate('/quizzes');
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  };

  return (
    <form className="quiz-shell" onSubmit={submit} style={{ maxWidth: 860 }}>
      <Link to="/quizzes" className="btn ghost sm" style={{ marginBottom: 18 }}>
        <ArrowLeft size={16} />
        All quizzes
      </Link>
      <div className="page-head">
        <div>
          <h1>New quiz</h1>
          <p>Students see it on their Quizzes page as soon as you publish.</p>
        </div>
      </div>

      <div className="panel stack">
        <div className="grid-3">
          <Field label="Class">
            <select className="select" value={grade} onChange={(e) => { setGrade(e.target.value); setSubjectId(''); setChapterId(''); }}>
              {CLASSES.map((c) => (
                <option key={c} value={c}>
                  Class {c}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Subject">
            <select className="select" value={subjectId} onChange={(e) => { setSubjectId(e.target.value); setChapterId(''); }}>
              <option value="">{subjects.loading ? 'Loading' : 'Choose'}</option>
              {subjects.data?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                  {s.stream ? ` (${s.stream})` : ''}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Chapter (optional)">
            <select className="select" value={chapterId} onChange={(e) => setChapterId(e.target.value)} disabled={!subjectId}>
              <option value="">Whole subject</option>
              {chapters.data?.chapters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.chapter_number}. {c.title}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="grid-2">
          <Field label="Title">
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Real Numbers: quick check" />
          </Field>
          <Field label="Time limit (minutes)">
            <input className="input" inputMode="numeric" value={duration} onChange={(e) => setDuration(e.target.value.replace(/\D/g, ''))} />
          </Field>
        </div>
        <Field label="Short description (optional)">
          <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
      </div>

      <div className="section-head" style={{ marginTop: 28 }}>
        <h2>Questions</h2>
        <span className="muted">{total} marks in total</span>
      </div>

      <div className="stack">
        {questions.map((q, i) => (
          <div className="panel stack" key={i}>
            <div className="row between">
              <h3>Question {i + 1}</h3>
              {questions.length > 1 && (
                <button type="button" className="icon-btn" onClick={() => setQuestions((qs) => qs.filter((_, j) => j !== i))} aria-label={`Remove question ${i + 1}`}>
                  <Trash2 size={16} />
                </button>
              )}
            </div>
            <textarea className="textarea" value={q.question} onChange={(e) => update(i, { question: e.target.value })} placeholder="Type the question" aria-label={`Question ${i + 1} text`} />
            <div className="grid-2">
              {LETTERS.map((l) => {
                const key = `option_${l.toLowerCase()}` as 'option_a';
                return (
                  <label key={l} className={`option${q.correct_option === l ? ' correct' : ''}`} style={{ cursor: 'text' }}>
                    <span className="letter">{l}</span>
                    <input
                      className="input"
                      style={{ border: 'none', padding: '4px 0', background: 'transparent', boxShadow: 'none' }}
                      value={q[key]}
                      onChange={(e) => update(i, { [key]: e.target.value })}
                      placeholder={`Option ${l}`}
                    />
                  </label>
                );
              })}
            </div>
            <div className="row wrap">
              <span className="small" style={{ fontWeight: 700 }}>Correct answer</span>
              <div className="segmented" role="group" aria-label={`Correct answer for question ${i + 1}`}>
                {LETTERS.map((l) => (
                  <button type="button" key={l} aria-pressed={q.correct_option === l} onClick={() => update(i, { correct_option: l })}>
                    {l}
                  </button>
                ))}
              </div>
              <span className="spacer" />
              <label className="row small">
                Marks
                <input className="input" style={{ width: 70 }} inputMode="numeric" value={q.marks} onChange={(e) => update(i, { marks: Number(e.target.value.replace(/\D/g, '')) })} />
              </label>
            </div>
          </div>
        ))}
      </div>

      <button type="button" className="btn soft" style={{ marginTop: 14 }} onClick={() => setQuestions((qs) => [...qs, blank()])}>
        <Plus size={18} />
        Add question
      </button>

      {error && <div style={{ marginTop: 16 }}><ErrorBox message={error} /></div>}

      <div className="row" style={{ justifyContent: 'flex-end', marginTop: 22 }}>
        <Link to="/quizzes" className="btn ghost">
          Cancel
        </Link>
        <button className="btn" disabled={saving}>
          {saving && <Loader2 size={18} className="spin" />}Publish quiz
        </button>
      </div>
    </form>
  );
}
