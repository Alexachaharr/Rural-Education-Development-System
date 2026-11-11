import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { Eye, EyeOff, Hash, Loader2, Lock, Mail, School as SchoolIcon, Smartphone, UserRound } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import type { AuthResponse, Role, School } from '../lib/types';
import { BrandMark } from '../components/Layout';
import { ErrorBox, Field } from '../components/ui';

type Mode = 'login' | 'signup';
type Method = 'password' | 'otp';

const CLASSES = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
const STREAMS = ['Science', 'Biology', 'Maths', 'Commerce', 'Humanities'];
const DEMOS: { role: Role; label: string; emoji: string; tone: string }[] = [
  { role: 'student', label: 'Student', emoji: '🎒', tone: 't-mint' },
  { role: 'teacher', label: 'Teacher', emoji: '🧑‍🏫', tone: 't-butter' },
  { role: 'parent', label: 'Parent', emoji: '🏡', tone: 't-peach' },
];

export default function AuthPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from || '/';

  const [mode, setMode] = useState<Mode>('login');
  const [method, setMethod] = useState<Method>('password');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPw, setShowPw] = useState(false);

  // login
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [devOtp, setDevOtp] = useState('');

  // signup
  const [form, setForm] = useState({
    name: '',
    email: '',
    mobile: '',
    password: '',
    confirm: '',
    role: 'student' as Role,
    class_grade: '',
    stream: '',
    roll_number: '',
    board: 'CBSE',
    school_id: '',
    school_name: '',
  });
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  // school search
  const [schoolQuery, setSchoolQuery] = useState('');
  const [schools, setSchools] = useState<School[]>([]);
  const [showSchools, setShowSchools] = useState(false);
  const schoolBox = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (schoolQuery.length < 2 || schoolQuery === form.school_name) {
      setSchools([]);
      return;
    }
    const t = setTimeout(() => {
      api
        .get<School[]>(`/schools/search?q=${encodeURIComponent(schoolQuery)}&limit=8`)
        .then((r) => {
          setSchools(r);
          setShowSchools(true);
        })
        .catch(() => {});
    }, 250);
    return () => clearTimeout(t);
  }, [schoolQuery, form.school_name]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (schoolBox.current && !schoolBox.current.contains(e.target as Node)) setShowSchools(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const finish = (data: AuthResponse) => {
    signIn(data);
    navigate(from, { replace: true });
  };

  const run = async (fn: () => Promise<void>) => {
    setError('');
    setLoading(true);
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const loginWithPassword = (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) return setError('Enter your email and password.');
    run(async () => finish(await api.post<AuthResponse>('/auth/login', { email, password })));
  };

  const requestOtp = () => {
    if (!/^\d{10}$/.test(mobile.replace(/\D/g, '').slice(-10))) return setError('Enter a 10-digit mobile number.');
    run(async () => {
      const r = await api.post<{ dev_otp?: string }>('/auth/request-otp', { mobile });
      setOtpSent(true);
      setDevOtp(r.dev_otp || '');
    });
  };

  const verifyOtp = (e: FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) return setError('Enter the 6-digit code.');
    run(async () => finish(await api.post<AuthResponse>('/auth/verify-otp', { mobile, otp })));
  };

  const tryDemo = (role: Role) =>
    run(async () => finish(await api.post<AuthResponse>('/auth/login', { email: `${role}@demo.com`, password: 'password123' })));

  const signup = (e: FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return setError('Enter your name.');
    if (!form.email && !form.mobile) return setError('Add an email or a mobile number.');
    if (form.password.length < 6) return setError('Password needs at least 6 characters.');
    if (form.password !== form.confirm) return setError('The two passwords are different.');
    if (form.role === 'student' && !form.class_grade) return setError('Choose your class.');
    run(async () => {
      const { confirm, ...payload } = form;
      void confirm;
      finish(
        await api.post<AuthResponse>('/auth/signup', {
          ...payload,
          school_name: payload.school_name || schoolQuery || undefined,
          stream: ['11', '12'].includes(payload.class_grade) ? payload.stream : undefined,
        })
      );
    });
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setError('');
  };

  return (
    <div className="auth">
      <section className="auth-art" aria-hidden={false}>
        <div className="brand">
          <BrandMark />
          <div className="brand-name">Vidya Setu</div>
        </div>
        <div className="stack-books" aria-hidden>
          <div className="book t-mint">
            <span style={{ fontSize: 28 }}>🔬</span>
            <div className="tag">Science</div>
          </div>
          <div className="book t-butter">
            <span style={{ fontSize: 28 }}>🔢</span>
            <div className="tag">Maths</div>
          </div>
          <div className="book t-peach">
            <span style={{ fontSize: 28 }}>🌍</span>
            <div className="tag">Social Science</div>
          </div>
        </div>
        <h1>Every chapter, in every village.</h1>
        <p>
          NCERT lessons you can download for later, quick quizzes, daily attendance and scholarships, for students,
          teachers and parents.
        </p>
      </section>

      <section className="auth-form">
        <div className="auth-form-inner">
          <h2 style={{ fontSize: '1.9rem' }}>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h2>
          <p className="muted" style={{ margin: '4px 0 22px' }}>
            {mode === 'login' ? 'Sign in to continue learning.' : 'It takes a minute and it is free.'}
          </p>

          {mode === 'login' && (
            <>
              <p className="small muted" style={{ marginBottom: 8 }}>
                Just looking around? Open a demo account:
              </p>
              <div className="demo-row">
                {DEMOS.map((d) => (
                  <button key={d.role} className={d.tone} onClick={() => tryDemo(d.role)} disabled={loading} type="button">
                    <span aria-hidden>{d.emoji}</span>
                    {d.label}
                  </button>
                ))}
              </div>
              <div className="divider">or sign in with your own</div>

              <div className="segmented" role="group" aria-label="Sign-in method" style={{ marginBottom: 18 }}>
                <button type="button" aria-pressed={method === 'password'} onClick={() => setMethod('password')}>
                  Email
                </button>
                <button type="button" aria-pressed={method === 'otp'} onClick={() => setMethod('otp')}>
                  Mobile OTP
                </button>
              </div>
            </>
          )}

          {error && (
            <div style={{ marginBottom: 14 }}>
              <ErrorBox message={error} />
            </div>
          )}

          {mode === 'login' && method === 'password' && (
            <form className="stack" onSubmit={loginWithPassword}>
              <Field label="Email">
                <div className="input-wrap">
                  <Mail size={18} />
                  <input className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
                </div>
              </Field>
              <Field label="Password">
                <div className="input-wrap">
                  <Lock size={18} />
                  <input className="input" type={showPw ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
                  <button type="button" className="reveal" onClick={() => setShowPw((s) => !s)} aria-label={showPw ? 'Hide password' : 'Show password'}>
                    {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </Field>
              <button className="btn block" disabled={loading}>
                {loading && <Loader2 size={18} className="spin" />}Sign in
              </button>
            </form>
          )}

          {mode === 'login' && method === 'otp' && (
            <form className="stack" onSubmit={verifyOtp}>
              <Field label="Mobile number">
                <div className="input-wrap">
                  <Smartphone size={18} />
                  <input className="input" inputMode="numeric" value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="98765 43210" disabled={otpSent} />
                </div>
              </Field>
              {!otpSent ? (
                <button type="button" className="btn block" onClick={requestOtp} disabled={loading}>
                  {loading && <Loader2 size={18} className="spin" />}Send code
                </button>
              ) : (
                <>
                  {devOtp && (
                    <div className="alert info">
                      Development mode: your code is <strong>{devOtp}</strong>. In production it is sent by SMS.
                    </div>
                  )}
                  <Field label="6-digit code">
                    <input className="input" inputMode="numeric" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} autoFocus />
                  </Field>
                  <button className="btn block" disabled={loading}>
                    {loading && <Loader2 size={18} className="spin" />}Verify and sign in
                  </button>
                  <button type="button" className="btn ghost block" onClick={() => { setOtpSent(false); setOtp(''); }}>
                    Use a different number
                  </button>
                </>
              )}
            </form>
          )}

          {mode === 'signup' && (
            <form className="stack" onSubmit={signup}>
              <div className="segmented" role="group" aria-label="I am a">
                {DEMOS.map((d) => (
                  <button key={d.role} type="button" aria-pressed={form.role === d.role} onClick={() => set('role', d.role)}>
                    {d.emoji} {d.label}
                  </button>
                ))}
              </div>
              <Field label="Full name">
                <div className="input-wrap">
                  <UserRound size={18} />
                  <input className="input" value={form.name} onChange={(e) => set('name', e.target.value)} autoComplete="name" />
                </div>
              </Field>
              <div className="grid-2">
                <Field label="Email">
                  <input className="input" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} autoComplete="email" />
                </Field>
                <Field label="Mobile">
                  <input className="input" inputMode="numeric" value={form.mobile} onChange={(e) => set('mobile', e.target.value)} />
                </Field>
              </div>

              {form.role === 'student' && (
                <div className="grid-2">
                  <Field label="Class">
                    <select className="select" value={form.class_grade} onChange={(e) => set('class_grade', e.target.value)}>
                      <option value="">Choose</option>
                      {CLASSES.map((c) => (
                        <option key={c} value={c}>
                          Class {c}
                        </option>
                      ))}
                    </select>
                  </Field>
                  {['11', '12'].includes(form.class_grade) ? (
                    <Field label="Stream">
                      <select className="select" value={form.stream} onChange={(e) => set('stream', e.target.value)}>
                        <option value="">Choose</option>
                        {STREAMS.map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </Field>
                  ) : (
                    <Field label="Roll number">
                      <div className="input-wrap">
                        <Hash size={18} />
                        <input className="input" value={form.roll_number} onChange={(e) => set('roll_number', e.target.value)} />
                      </div>
                    </Field>
                  )}
                </div>
              )}
              {form.role === 'student' && ['11', '12'].includes(form.class_grade) && (
                <Field label="Roll number">
                  <input className="input" value={form.roll_number} onChange={(e) => set('roll_number', e.target.value)} />
                </Field>
              )}

              <Field label="School" hint="Start typing to search, or enter your school's name.">
                <div className="input-wrap" ref={schoolBox}>
                  <SchoolIcon size={18} />
                  <input
                    className="input"
                    value={schoolQuery}
                    onChange={(e) => {
                      setSchoolQuery(e.target.value);
                      setForm((f) => ({ ...f, school_id: '', school_name: '' }));
                    }}
                    onFocus={() => schools.length && setShowSchools(true)}
                    placeholder="e.g. Kendriya Vidyalaya"
                    autoComplete="off"
                  />
                  {showSchools && schools.length > 0 && (
                    <ul className="school-results">
                      {schools.map((s) => (
                        <li key={s.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setForm((f) => ({ ...f, school_id: String(s.id), school_name: s.name, board: s.board || f.board }));
                              setSchoolQuery(s.name);
                              setShowSchools(false);
                            }}
                          >
                            <strong>{s.name}</strong>
                            <div className="small faint">
                              {s.city}, {s.state}
                            </div>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </Field>

              <div className="grid-2">
                <Field label="Password">
                  <input className="input" type="password" value={form.password} onChange={(e) => set('password', e.target.value)} autoComplete="new-password" />
                </Field>
                <Field label="Confirm password">
                  <input className="input" type="password" value={form.confirm} onChange={(e) => set('confirm', e.target.value)} autoComplete="new-password" />
                </Field>
              </div>
              <button className="btn block" disabled={loading}>
                {loading && <Loader2 size={18} className="spin" />}Create account
              </button>
            </form>
          )}

          <p className="small muted" style={{ marginTop: 20, textAlign: 'center' }}>
            {mode === 'login' ? 'New here? ' : 'Already have an account? '}
            <button
              type="button"
              onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}
              style={{ border: 'none', background: 'none', color: 'var(--lilac-deep)', fontWeight: 700, cursor: 'pointer', padding: 0 }}
            >
              {mode === 'login' ? 'Create an account' : 'Sign in'}
            </button>
          </p>
        </div>
      </section>
    </div>
  );
}
