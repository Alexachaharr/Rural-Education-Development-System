import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router';
import { ChevronDown, Download, FileText, Loader2, PlayCircle, Plus, ArrowLeft, StickyNote } from 'lucide-react';
import { api, mediaUrl } from '../lib/api';
import { useUser } from '../lib/auth';
import { useFetch } from '../lib/useFetch';
import { pastelFor } from '../lib/format';
import type { Chapter, Content, Subject } from '../lib/types';
import { Empty, ErrorBox, Field, Loader, Modal, useToast } from '../components/ui';

export default function SubjectPage() {
  const { subjectId } = useParams();
  const user = useUser();
  const { data, loading, error, reload } = useFetch<{ subject: Subject; chapters: Chapter[] }>(`/courses/chapters/${subjectId}`);
  const [open, setOpen] = useState<number | null>(null);
  const [uploadFor, setUploadFor] = useState<Chapter | null>(null);
  const [video, setVideo] = useState<Content | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [toast, showToast] = useToast();

  if (loading) return <Loader />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (!data) return null;

  const { subject, chapters } = data;
  const tone = pastelFor(subject.name);

  return (
    <div className={`t-${tone}`}>
      <Link to="/courses" className="btn ghost sm" style={{ marginBottom: 18 }}>
        <ArrowLeft size={16} />
        All subjects
      </Link>
      <div className="page-head">
        <div className="row" style={{ gap: 16, alignItems: 'center' }}>
          <span className="icon-blob" style={{ width: 64, height: 64, fontSize: 32, borderRadius: 18 }} aria-hidden>
            {subject.icon}
          </span>
          <div>
            <h1>{subject.name}</h1>
            <p style={{ marginTop: 2 }}>
              Class {subject.class_grade}
              {subject.stream ? `, ${subject.stream}` : ''}, {chapters.length} chapter{chapters.length === 1 ? '' : 's'}
            </p>
          </div>
        </div>
      </div>

      {chapters.length === 0 ? (
        <Empty emoji="🗒️" title="Chapters are on their way">
          This subject has no chapters yet.
        </Empty>
      ) : (
        chapters.map((ch) => (
          <div className="chapter" key={ch.id}>
            <button className="chapter-head" onClick={() => setOpen(open === ch.id ? null : ch.id)} aria-expanded={open === ch.id}>
              <span className="chapter-num">{ch.chapter_number}</span>
              <div className="spacer">
                <h3>{ch.title}</h3>
                {ch.description && <p className="small muted">{ch.description}</p>}
              </div>
              {ch.content_count > 0 && <span className="chip">{ch.content_count} item{ch.content_count > 1 ? 's' : ''}</span>}
              <ChevronDown className={`chev${open === ch.id ? ' open' : ''}`} size={20} />
            </button>
            {open === ch.id && (
              <div className="chapter-body">
                <ChapterContent
                  key={refreshKey}
                  chapterId={ch.id}
                  onPlay={setVideo}
                  onError={showToast}
                />
                {user.role === 'teacher' && (
                  <button className="btn soft sm" style={{ marginTop: 12 }} onClick={() => setUploadFor(ch)}>
                    <Plus size={16} />
                    Add material
                  </button>
                )}
              </div>
            )}
          </div>
        ))
      )}

      {uploadFor && (
        <UploadModal
          chapter={uploadFor}
          onClose={() => setUploadFor(null)}
          onDone={() => {
            setUploadFor(null);
            setRefreshKey((k) => k + 1);
            reload();
            showToast('Material added to the chapter');
          }}
        />
      )}

      {video && (
        <Modal title={video.title} onClose={() => setVideo(null)} wide>
          <div className="video-frame">
            {video.url?.startsWith('/uploads') ? (
              <video src={mediaUrl(video.url)} controls autoPlay />
            ) : (
              <iframe
                src={video.url ?? ''}
                title={video.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            )}
          </div>
        </Modal>
      )}
      {toast}
    </div>
  );
}

function ChapterContent({
  chapterId,
  onPlay,
  onError,
}: {
  chapterId: number;
  onPlay: (c: Content) => void;
  onError: (m: string) => void;
}) {
  const { data, loading, error } = useFetch<Content[]>(`/courses/content/${chapterId}`);
  const [busy, setBusy] = useState<number | null>(null);

  if (loading) return <Loader />;
  if (error) return <ErrorBox message={error} />;
  if (!data?.length) return <p className="muted small">Nothing here yet. Your teacher will add videos and notes soon.</p>;

  const download = async (c: Content) => {
    setBusy(c.id);
    try {
      await api.download(`/courses/download/${c.id}`, `${c.title}.pdf`);
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <ul className="list">
      {data.map((c) => (
        <li key={c.id}>
          <span className={`icon-blob t-${c.type === 'video' ? 'rose' : c.type === 'pdf' ? 'sky' : 'butter'}`}>
            {c.type === 'video' ? <PlayCircle size={20} /> : c.type === 'pdf' ? <FileText size={20} /> : <StickyNote size={20} />}
          </span>
          <div className="grow">
            <div className="title">{c.title}</div>
            <div className="small muted">
              {c.type === 'video' ? `Video${c.duration_mins ? `, ${c.duration_mins} min` : ''}` : c.type === 'pdf' ? `PDF${c.size_mb ? `, ${c.size_mb} MB` : ''}` : 'Notes'}
            </div>
          </div>
          {c.type === 'video' ? (
            <button className="btn sm" onClick={() => onPlay(c)}>
              Watch
            </button>
          ) : c.type === 'pdf' ? (
            <button className="btn sm soft" onClick={() => download(c)} disabled={busy === c.id}>
              {busy === c.id ? <Loader2 size={16} className="spin" /> : <Download size={16} />}
              Download
            </button>
          ) : c.url ? (
            <a className="btn sm soft" href={mediaUrl(c.url)} target="_blank" rel="noreferrer">
              Open
            </a>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function UploadModal({ chapter, onClose, onDone }: { chapter: Chapter; onClose: () => void; onDone: () => void }) {
  const [type, setType] = useState<'pdf' | 'video' | 'notes'>('pdf');
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [minutes, setMinutes] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!title.trim()) return setError('Give the material a title.');
    if (type === 'pdf' && !file) return setError('Choose a PDF file.');
    if (type === 'video' && !url && !file) return setError('Paste a YouTube link or choose a video file.');
    const fd = new FormData();
    fd.append('chapter_id', String(chapter.id));
    fd.append('title', title.trim());
    fd.append('type', type);
    if (url) fd.append('url', url);
    if (minutes) fd.append('duration_mins', minutes);
    if (file) fd.append('file', file);
    setSaving(true);
    try {
      await api.post('/courses/upload', fd);
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Add material" subtitle={`Chapter ${chapter.chapter_number}: ${chapter.title}`} onClose={onClose}>
      <form className="stack" onSubmit={submit}>
        <div className="segmented" role="group" aria-label="Type">
          {(['pdf', 'video', 'notes'] as const).map((t) => (
            <button key={t} type="button" aria-pressed={type === t} onClick={() => { setType(t); setFile(null); }}>
              {t === 'pdf' ? 'PDF' : t === 'video' ? 'Video' : 'Notes link'}
            </button>
          ))}
        </div>
        {error && <ErrorBox message={error} />}
        <Field label="Title">
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Chapter summary" />
        </Field>
        {type === 'pdf' && (
          <Field label="PDF file" hint="Up to 50 MB.">
            <input className="input" type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </Field>
        )}
        {type === 'video' && (
          <>
            <Field label="YouTube link" hint="Any normal YouTube link works, it is converted for you.">
              <input className="input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=..." />
            </Field>
            <Field label="Or upload a video file">
              <input className="input" type="file" accept="video/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </Field>
            <Field label="Length in minutes (optional)">
              <input className="input" inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value.replace(/\D/g, ''))} />
            </Field>
          </>
        )}
        {type === 'notes' && (
          <Field label="Link to notes" hint="A Google Drive, website or other link.">
            <input className="input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
          </Field>
        )}
        <div className="row" style={{ justifyContent: 'flex-end', marginTop: 6 }}>
          <button type="button" className="btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn" disabled={saving}>
            {saving && <Loader2 size={18} className="spin" />}Add material
          </button>
        </div>
      </form>
    </Modal>
  );
}
