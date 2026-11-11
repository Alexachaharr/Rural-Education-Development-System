import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router';
import { ArrowLeft, Check, Loader2, X } from 'lucide-react';
import { api } from '../lib/api';
import { useUser } from '../lib/auth';
import { useFetch } from '../lib/useFetch';
import type { Letter, QuizDetail, QuizResult } from '../lib/types';
import { ErrorBox, Loader, Ring } from '../components/ui';

const LETTERS: Letter[] = ['A', 'B', 'C', 'D'];
const optionText = (q: Record<string, unknown>, l: Letter) => String(q[`option_${l.toLowerCase()}`] ?? '');

export default function QuizTake() {
  const { id } = useParams();
  const user = useUser();
  const { data: quiz, loading, error } = useFetch<QuizDetail>(`/quizzes/${id}`);

  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, Letter>>({});
  const [left, setLeft] = useState(0);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const startedAt = useRef(0);

  const submit = useCallback(async () => {
    if (!quiz || submitting) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      const r = await api.post<QuizResult>(`/quizzes/${quiz.id}/submit`, {
        answers,
        time_taken_secs: Math.round((Date.now() - startedAt.current) / 1000),
      });
      setResult(r);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      setSubmitError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }, [quiz, answers, submitting]);

  // countdown
  useEffect(() => {
    if (!started || result) return;
    if (left <= 0) {
      submit();
      return;
    }
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [started, left, result, submit]);

  if (loading) return <Loader />;
  if (error) return <ErrorBox message={error} />;
  if (!quiz) return null;

  const back = (
    <Link to="/quizzes" className="btn ghost sm" style={{ marginBottom: 18 }}>
      <ArrowLeft size={16} />
      All quizzes
    </Link>
  );

  if (user.role !== 'student') {
    return (
      <div className="quiz-shell">
        {back}
        <h1>{quiz.title}</h1>
        <p className="muted" style={{ margin: '6px 0 18px' }}>
          Preview: only students can submit answers.
        </p>
        <div className="stack">
          {quiz.questions.map((q, i) => (
            <div className="panel" key={q.id}>
              <h3>
                {i + 1}. {q.question}
              </h3>
              <ul className="small muted" style={{ margin: '8px 0 0', paddingLeft: 18 }}>
                {LETTERS.map((l) => (
                  <li key={l}>
                    {l}. {optionText(q as unknown as Record<string, unknown>, l)}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ─── Results ─── */
  if (result) {
    const tone = result.percentage >= 75 ? 'var(--mint-deep)' : result.percentage >= 40 ? 'var(--butter-deep)' : 'var(--rose-deep)';
    return (
      <div className="quiz-shell">
        {back}
        <div className="notebook" style={{ marginBottom: 22 }}>
          <div className="tape" aria-hidden />
          <div className="row wrap" style={{ gap: 28 }}>
            <Ring value={result.percentage} size={140} stroke={14} tone={tone} label="score" />
            <div>
              <p className="muted">{quiz.title}</p>
              <div className="result-score">
                {result.score}/{result.total_marks}
              </div>
              <p className="notebook-line">
                {result.percentage >= 75
                  ? 'Excellent work! You know this chapter well.'
                  : result.percentage >= 40
                    ? 'Good effort. Review the ones you missed below.'
                    : 'Keep practising. Re-read the chapter and try again.'}
              </p>
              <p className="small muted" style={{ marginTop: 6 }}>
                {result.correct_answers} correct, {result.wrong_answers} wrong, {result.unanswered} skipped
              </p>
            </div>
          </div>
        </div>

        <h2 style={{ marginBottom: 12 }}>Review your answers</h2>
        <div className="stack">
          {result.questions.map((q, i) => (
            <div className="panel" key={q.id}>
              <h3 style={{ marginBottom: 12 }}>
                {i + 1}. {q.question}
              </h3>
              <div className="stack" style={{ gap: 8 }}>
                {LETTERS.map((l) => {
                  const isRight = l === q.correct_option;
                  const isPicked = l === q.user_answer;
                  return (
                    <div key={l} className={`option${isRight ? ' correct' : isPicked ? ' wrong' : ''}`} style={{ cursor: 'default' }}>
                      <span className="letter">{l}</span>
                      <span className="spacer">{optionText(q as unknown as Record<string, unknown>, l)}</span>
                      {isRight && <Check size={18} color="var(--mint-deep)" aria-label="Correct answer" />}
                      {isPicked && !isRight && <X size={18} color="var(--danger)" aria-label="Your answer" />}
                    </div>
                  );
                })}
              </div>
              {!q.user_answer && <p className="small muted" style={{ marginTop: 8 }}>You skipped this one.</p>}
            </div>
          ))}
        </div>
        <div className="row" style={{ marginTop: 20 }}>
          <button
            className="btn"
            onClick={() => {
              setResult(null);
              setAnswers({});
              setIndex(0);
              setStarted(false);
            }}
          >
            Try again
          </button>
          <Link to="/quizzes" className="btn ghost">
            Back to quizzes
          </Link>
        </div>
      </div>
    );
  }

  /* ─── Intro ─── */
  if (!started) {
    return (
      <div className="quiz-shell">
        {back}
        <div className="notebook">
          <div className="tape" aria-hidden />
          <p className="muted">{quiz.subject_name}{quiz.chapter_title ? `, ${quiz.chapter_title}` : ''}</p>
          <h1 className="notebook-greeting" style={{ maxWidth: '20ch' }}>{quiz.title}</h1>
          {quiz.description && <p className="notebook-line">{quiz.description}</p>}
          <div className="notebook-stats">
            <div className="notebook-stat"><strong>{quiz.questions.length}</strong><span>questions</span></div>
            <div className="notebook-stat"><strong>{quiz.duration_mins} min</strong><span>time limit</span></div>
            <div className="notebook-stat"><strong>{quiz.total_marks}</strong><span>marks</span></div>
          </div>
          <button
            className="btn"
            style={{ marginTop: 26 }}
            disabled={!quiz.questions.length}
            onClick={() => {
              startedAt.current = Date.now();
              setLeft(quiz.duration_mins * 60);
              setStarted(true);
            }}
          >
            Start quiz
          </button>
          {!quiz.questions.length && <p className="small muted" style={{ marginTop: 8 }}>This quiz has no questions yet.</p>}
        </div>
      </div>
    );
  }

  /* ─── Taking ─── */
  const q = quiz.questions[index];
  const answered = Object.keys(answers).length;
  const mm = Math.floor(left / 60);
  const ss = String(left % 60).padStart(2, '0');

  return (
    <div className="quiz-shell">
      <div className="row between wrap">
        <div>
          <p className="muted small">{quiz.title}</p>
          <h2>
            Question {index + 1} of {quiz.questions.length}
          </h2>
        </div>
        <span className={`timer${left < 60 ? ' low' : ''}`} aria-live="polite" aria-label={`${mm} minutes ${ss} seconds left`}>
          {mm}:{ss}
        </span>
      </div>

      <div className="quiz-progress" aria-label="Jump to question">
        {quiz.questions.map((qq, i) => (
          <button
            key={qq.id}
            className={`${answers[qq.id] ? 'answered' : ''}${i === index ? ' current' : ''}`}
            onClick={() => setIndex(i)}
            aria-label={`Question ${i + 1}${answers[qq.id] ? ', answered' : ''}`}
          >
            {i + 1}
          </button>
        ))}
      </div>

      <div className="panel">
        <h3 style={{ fontSize: '1.3rem', marginBottom: 16 }}>{q.question}</h3>
        <div className="stack" style={{ gap: 10 }} role="radiogroup" aria-label="Options">
          {LETTERS.map((l) => (
            <button
              key={l}
              role="radio"
              aria-checked={answers[q.id] === l}
              className={`option${answers[q.id] === l ? ' selected' : ''}`}
              onClick={() => setAnswers((a) => ({ ...a, [q.id]: l }))}
            >
              <span className="letter">{l}</span>
              {optionText(q as unknown as Record<string, unknown>, l)}
            </button>
          ))}
        </div>
      </div>

      {submitError && <div style={{ marginTop: 14 }}><ErrorBox message={submitError} /></div>}

      <div className="row between wrap" style={{ marginTop: 18 }}>
        <button className="btn ghost" onClick={() => setIndex((i) => i - 1)} disabled={index === 0}>
          Previous
        </button>
        <span className="small muted">
          {answered} of {quiz.questions.length} answered
        </span>
        {index < quiz.questions.length - 1 ? (
          <button className="btn soft" onClick={() => setIndex((i) => i + 1)}>
            Next
          </button>
        ) : (
          <button
            className="btn"
            disabled={submitting}
            onClick={() => {
              const unanswered = quiz.questions.length - answered;
              if (unanswered > 0 && !window.confirm(`You have ${unanswered} unanswered question${unanswered > 1 ? 's' : ''}. Submit anyway?`)) return;
              submit();
            }}
          >
            {submitting && <Loader2 size={18} className="spin" />}Submit answers
          </button>
        )}
      </div>
    </div>
  );
}
