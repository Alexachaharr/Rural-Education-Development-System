import { useState, type FormEvent } from 'react';
import { Loader2 } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth, useUser } from '../lib/auth';
import { useFetch } from '../lib/useFetch';
import { initials } from '../lib/format';
import type { Child, User } from '../lib/types';
import { Empty, ErrorBox, Field, Loader, useToast } from '../components/ui';

const CLASSES = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
const STREAMS = ['Science', 'Biology', 'Maths', 'Commerce', 'Humanities'];

export default function Profile() {
  const user = useUser();
  const [toast, showToast] = useToast();
  return (
    <>
      <div className="page-head">
        <div className="row" style={{ gap: 16 }}>
          <div className="avatar" style={{ width: 64, height: 64, fontSize: '1.5rem' }}>
            {initials(user.name)}
          </div>
          <div>
            <h1>{user.name}</h1>
            <p style={{ marginTop: 2, textTransform: 'capitalize' }}>
              {user.role}
              {user.school_name ? ` at ${user.school_name}` : ''}
            </p>
          </div>
        </div>
      </div>
      <div className="grid-2" style={{ alignItems: 'start' }}>
        <div>
          <ProfileForm onSaved={() => showToast('Profile saved')} />
          {user.role === 'parent' && <LinkChild onLinked={(n) => showToast(`${n} is now linked to your account`)} />}
        </div>
        <PasswordForm onSaved={() => showToast('Password changed')} />
      </div>
      {toast}
    </>
  );
}

function ProfileForm({ onSaved }: { onSaved: () => void }) {
  const user = useUser();
  const { updateUser } = useAuth();
  const [f, setF] = useState({
    name: user.name,
    class_grade: user.class_grade ?? '',
    stream: user.stream ?? '',
    roll_number: user.roll_number ?? '',
    school_name: user.school_name ?? '',
    board: user.board ?? 'CBSE',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (k: keyof typeof f, v: string) => setF((x) => ({ ...x, [k]: v }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!f.name.trim()) return setError('Name cannot be empty.');
    setSaving(true);
    setError('');
    try {
      const u = await api.patch<User>('/users/me', f);
      updateUser(u);
      onSaved();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="panel stack" onSubmit={submit}>
      <h2>Your details</h2>
      {error && <ErrorBox message={error} />}
      <Field label="Name">
        <input className="input" value={f.name} onChange={(e) => set('name', e.target.value)} />
      </Field>
      <div className="grid-2">
        <Field label="Email">
          <input className="input" value={user.email ?? ''} disabled />
        </Field>
        <Field label="Mobile">
          <input className="input" value={user.mobile ?? ''} disabled />
        </Field>
      </div>
      {user.role === 'student' && (
        <div className="grid-2">
          <Field label="Class">
            <select className="select" value={f.class_grade} onChange={(e) => set('class_grade', e.target.value)}>
              <option value="">Choose</option>
              {CLASSES.map((c) => (
                <option key={c} value={c}>
                  Class {c}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Roll number">
            <input className="input" value={f.roll_number} onChange={(e) => set('roll_number', e.target.value)} />
          </Field>
        </div>
      )}
      {user.role === 'student' && ['11', '12'].includes(f.class_grade) && (
        <Field label="Stream">
          <select className="select" value={f.stream} onChange={(e) => set('stream', e.target.value)}>
            <option value="">Choose</option>
            {STREAMS.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
      )}
      <div className="grid-2">
        <Field label="School">
          <input className="input" value={f.school_name} onChange={(e) => set('school_name', e.target.value)} />
        </Field>
        <Field label="Board">
          <select className="select" value={f.board} onChange={(e) => set('board', e.target.value)}>
            <option>CBSE</option>
            <option>ICSE</option>
          </select>
        </Field>
      </div>
      <div>
        <button className="btn" disabled={saving}>
          {saving && <Loader2 size={18} className="spin" />}Save details
        </button>
      </div>
    </form>
  );
}

function PasswordForm({ onSaved }: { onSaved: () => void }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (next.length < 6) return setError('New password needs at least 6 characters.');
    if (next !== confirm) return setError('The new passwords are different.');
    setSaving(true);
    try {
      await api.post('/users/change-password', { current_password: current, new_password: next });
      setCurrent('');
      setNext('');
      setConfirm('');
      onSaved();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="panel stack" onSubmit={submit}>
      <h2>Change password</h2>
      {error && <ErrorBox message={error} />}
      <Field label="Current password">
        <input className="input" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
      </Field>
      <Field label="New password">
        <input className="input" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
      </Field>
      <Field label="Confirm new password">
        <input className="input" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </Field>
      <div>
        <button className="btn soft" disabled={saving}>
          {saving && <Loader2 size={18} className="spin" />}Change password
        </button>
      </div>
    </form>
  );
}

function LinkChild({ onLinked }: { onLinked: (name: string) => void }) {
  const kids = useFetch<Child[]>('/users/my-children');
  const [roll, setRoll] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!roll.trim()) return setError("Enter your child's roll number.");
    setSaving(true);
    setError('');
    try {
      const r = await api.post<{ child: Child }>('/users/link-child', { child_roll_number: roll.trim() });
      setRoll('');
      kids.reload();
      onLinked(r.child.name);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="panel stack">
      <h2>Your children</h2>
      {kids.loading ? (
        <Loader />
      ) : kids.data?.length ? (
        <ul className="list">
          {kids.data.map((c) => (
            <li key={c.id}>
              <div className="avatar">{initials(c.name)}</div>
              <div className="grow">
                <div className="title">{c.name}</div>
                <div className="small muted">
                  Class {c.class_grade ?? '?'}, roll {c.roll_number ?? '?'}
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <Empty emoji="👧" title="No children linked yet" />
      )}
      <form className="row wrap" onSubmit={submit} style={{ alignItems: 'flex-end' }}>
        <Field label="Child's roll number" style={{ flex: 1, minWidth: 180 }}>
          <input className="input" value={roll} onChange={(e) => setRoll(e.target.value)} placeholder="e.g. S003" />
        </Field>
        <button className="btn" disabled={saving}>
          {saving && <Loader2 size={18} className="spin" />}Link child
        </button>
      </form>
      {error && <ErrorBox message={error} />}
    </div>
  );
}
