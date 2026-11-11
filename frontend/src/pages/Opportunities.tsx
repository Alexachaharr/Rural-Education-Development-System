import { useMemo, useState, type FormEvent } from 'react';
import { CalendarDays, ExternalLink, Loader2, Plus, Search } from 'lucide-react';
import { api } from '../lib/api';
import { useUser } from '../lib/auth';
import { useFetch } from '../lib/useFetch';
import { daysUntil, formatDate, pastelFor } from '../lib/format';
import type { Competition, Scholarship } from '../lib/types';
import { Empty, ErrorBox, Field, Loader, Modal, useToast } from '../components/ui';

export default function Opportunities() {
  const user = useUser();
  const [tab, setTab] = useState<'scholarships' | 'competitions'>('scholarships');
  const [adding, setAdding] = useState(false);
  const scholarships = useFetch<Scholarship[]>('/scholarships');
  const competitions = useFetch<Competition[]>(tab === 'competitions' ? '/scholarships/competitions' : null);
  const [toast, showToast] = useToast();

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Scholarships and competitions</h1>
          <p>Government and private scholarships, plus olympiads and talent exams you can enter.</p>
        </div>
        <div className="row wrap">
          <div className="segmented" role="group" aria-label="Show">
            <button aria-pressed={tab === 'scholarships'} onClick={() => setTab('scholarships')}>
              Scholarships
            </button>
            <button aria-pressed={tab === 'competitions'} onClick={() => setTab('competitions')}>
              Competitions
            </button>
          </div>
          {user.role === 'teacher' && tab === 'scholarships' && (
            <button className="btn" onClick={() => setAdding(true)}>
              <Plus size={18} />
              Add scholarship
            </button>
          )}
        </div>
      </div>

      {tab === 'scholarships' ? (
        <ScholarshipList
          state={scholarships}
          canApply={user.role === 'student'}
          onToast={showToast}
        />
      ) : competitions.loading ? (
        <Loader />
      ) : competitions.error ? (
        <ErrorBox message={competitions.error} onRetry={competitions.reload} />
      ) : !competitions.data?.length ? (
        <Empty emoji="🏆" title="No competitions listed right now" />
      ) : (
        <div className="grid-3">
          {competitions.data.map((c) => (
            <div key={c.id} className={`ticket t-${pastelFor(c.level ?? c.id)}`}>
              <span className="chip" style={{ alignSelf: 'flex-start' }}>
                {c.level ?? 'Open'}
              </span>
              <h3>{c.title}</h3>
              {c.prize && <div className="amount">{c.prize}</div>}
              <p className="small muted">{c.description}</p>
              <div className="foot">
                <div className="small">
                  {c.registration_deadline && (
                    <div>
                      Register by <strong>{formatDate(c.registration_deadline, { day: 'numeric', month: 'short', year: 'numeric' })}</strong>
                    </div>
                  )}
                  {c.event_date && <div className="muted">Exam on {formatDate(c.event_date, { day: 'numeric', month: 'short' })}</div>}
                </div>
                {c.apply_url && (
                  <a className="btn sm" href={c.apply_url} target="_blank" rel="noreferrer">
                    Visit site
                    <ExternalLink size={14} />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {adding && (
        <AddScholarship
          onClose={() => setAdding(false)}
          onDone={() => {
            setAdding(false);
            scholarships.reload();
            showToast('Scholarship added');
          }}
        />
      )}
      {toast}
    </>
  );
}

function ScholarshipList({
  state,
  canApply,
  onToast,
}: {
  state: ReturnType<typeof useFetch<Scholarship[]>>;
  canApply: boolean;
  onToast: (m: string) => void;
}) {
  const { data, loading, error, reload, setData } = state;
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [busy, setBusy] = useState<number | null>(null);

  const categories = useMemo(() => Array.from(new Set((data ?? []).map((s) => s.category).filter(Boolean))) as string[], [data]);
  const shown = (data ?? []).filter(
    (s) =>
      (!category || s.category === category) &&
      (!q || `${s.title} ${s.provider} ${s.eligibility ?? ''}`.toLowerCase().includes(q.toLowerCase()))
  );

  const toggle = async (s: Scholarship) => {
    setBusy(s.id);
    try {
      if (s.applied) {
        await api.delete(`/scholarships/${s.id}/apply`);
        onToast('Removed from your applications');
      } else {
        await api.post(`/scholarships/${s.id}/apply`);
        onToast('Saved to your applications. Finish applying on the official site.');
        if (s.apply_url) window.open(s.apply_url, '_blank', 'noopener');
      }
      setData((list) => (list ?? []).map((x) => (x.id === s.id ? { ...x, applied: !s.applied } : x)));
    } catch (e) {
      onToast((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  if (loading) return <Loader />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;

  return (
    <>
      <div className="row wrap" style={{ marginBottom: 18 }}>
        <div className="input-wrap" style={{ flex: '1 1 260px', maxWidth: 420 }}>
          <Search size={18} />
          <input className="input" placeholder="Search by name, provider or eligibility" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search scholarships" />
        </div>
        <select className="select" style={{ width: 'auto' }} value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category">
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>

      {!shown.length ? (
        <Empty emoji="🔍" title="No scholarships match">
          Try a different search or category.
        </Empty>
      ) : (
        <div className="grid-3">
          {shown.map((s) => {
            const days = daysUntil(s.deadline);
            const closed = days < 0;
            return (
              <div key={s.id} className={`ticket t-${pastelFor(s.category ?? s.id)}`}>
                <div className="row between wrap">
                  {s.category && <span className="chip">{s.category}</span>}
                  {s.applied && <span className="chip t-mint">Applied</span>}
                </div>
                <h3>{s.title}</h3>
                <div className="amount">{s.amount}</div>
                <p className="small muted">{s.provider}</p>
                {s.eligibility && (
                  <p className="small">
                    <strong>Who can apply:</strong> {s.eligibility}
                  </p>
                )}
                <div className="foot">
                  <span className="small row" style={{ gap: 6 }}>
                    <CalendarDays size={15} />
                    {closed ? 'Closed' : days <= 30 ? <strong style={{ color: 'var(--rose-deep)' }}>{days} days left</strong> : `Closes ${formatDate(s.deadline, { day: 'numeric', month: 'short', year: 'numeric' })}`}
                  </span>
                  {canApply ? (
                    <button className={`btn sm${s.applied ? ' ghost' : ''}`} onClick={() => toggle(s)} disabled={busy === s.id || (closed && !s.applied)}>
                      {busy === s.id && <Loader2 size={14} className="spin" />}
                      {s.applied ? 'Withdraw' : 'Apply'}
                    </button>
                  ) : (
                    s.apply_url && (
                      <a className="btn sm soft" href={s.apply_url} target="_blank" rel="noreferrer">
                        Details
                        <ExternalLink size={14} />
                      </a>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

function AddScholarship({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState({ title: '', amount: '', provider: '', deadline: '', category: '', eligibility: '', description: '', apply_url: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (k: keyof typeof f, v: string) => setF((x) => ({ ...x, [k]: v }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!f.title || !f.amount || !f.provider || !f.deadline) return setError('Title, amount, provider and deadline are required.');
    setSaving(true);
    setError('');
    try {
      await api.post('/scholarships', f);
      onDone();
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  };

  return (
    <Modal title="Add a scholarship" subtitle="Students in every school will see it." onClose={onClose}>
      <form className="stack" onSubmit={submit}>
        {error && <ErrorBox message={error} />}
        <Field label="Title">
          <input className="input" value={f.title} onChange={(e) => set('title', e.target.value)} />
        </Field>
        <div className="grid-2">
          <Field label="Amount">
            <input className="input" value={f.amount} onChange={(e) => set('amount', e.target.value)} placeholder="₹10,000/year" />
          </Field>
          <Field label="Deadline">
            <input className="input" type="date" value={f.deadline} onChange={(e) => set('deadline', e.target.value)} />
          </Field>
        </div>
        <div className="grid-2">
          <Field label="Provider">
            <input className="input" value={f.provider} onChange={(e) => set('provider', e.target.value)} />
          </Field>
          <Field label="Category">
            <input className="input" value={f.category} onChange={(e) => set('category', e.target.value)} placeholder="Merit Based" />
          </Field>
        </div>
        <Field label="Who can apply">
          <input className="input" value={f.eligibility} onChange={(e) => set('eligibility', e.target.value)} />
        </Field>
        <Field label="Official link">
          <input className="input" type="url" value={f.apply_url} onChange={(e) => set('apply_url', e.target.value)} placeholder="https://" />
        </Field>
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn" disabled={saving}>
            {saving && <Loader2 size={18} className="spin" />}Add scholarship
          </button>
        </div>
      </form>
    </Modal>
  );
}
