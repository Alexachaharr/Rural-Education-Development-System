import { useState } from 'react';
import { Link } from 'react-router';
import { useUser } from '../lib/auth';
import { useFetch } from '../lib/useFetch';
import { pastelFor } from '../lib/format';
import type { Subject } from '../lib/types';
import { Empty, ErrorBox, Loader, Field } from '../components/ui';

const CLASSES = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];

/** A subject drawn as a school notebook with a name label */
export function SubjectCover({ subject, name }: { subject: Subject; name?: string }) {
  const tone = pastelFor(subject.name);
  return (
    <Link to={`/courses/${subject.id}`} className={`cover t-${tone}`}>
      <span className="cover-emoji" aria-hidden>
        {subject.icon}
      </span>
      <div className="cover-label">
        <div className="row">
          <span className="k">Subject</span>
          <span className="v">{subject.name}</span>
        </div>
        <div className="meta">
          <div className="row">
            <span className="k">Class</span>
            <span className="v small">
              {subject.class_grade}
              {subject.stream ? `, ${subject.stream}` : ''}
            </span>
          </div>
          <div className="row">
            <span className="k">Chapters</span>
            <span className="v small">{subject.chapter_count ? subject.chapter_count : 'Soon'}</span>
          </div>
        </div>
        {name && (
          <div className="row">
            <span className="k">Name</span>
            <span className="v small">{name}</span>
          </div>
        )}
      </div>
    </Link>
  );
}

export default function Courses() {
  const user = useUser();
  const [grade, setGrade] = useState(user.class_grade || '10');
  const stream = grade === user.class_grade && user.stream ? `&stream=${encodeURIComponent(user.stream)}` : '';
  const { data, loading, error, reload } = useFetch<Subject[]>(`/courses/subjects?class_grade=${grade}${stream}`);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{user.role === 'teacher' ? 'Lessons and notes' : 'Courses'}</h1>
          <p>
            {user.role === 'teacher'
              ? 'Open a subject to upload PDFs or add videos to its chapters.'
              : 'NCERT chapters with videos and notes you can download to read offline.'}
          </p>
        </div>
        <Field label="Class" style={{ minWidth: 160 }}>
          <select className="select" value={grade} onChange={(e) => setGrade(e.target.value)}>
            {CLASSES.map((c) => (
              <option key={c} value={c}>
                Class {c}
                {c === user.class_grade ? ' (yours)' : ''}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {loading ? (
        <Loader label="Opening your bag" />
      ) : error ? (
        <ErrorBox message={error} onRetry={reload} />
      ) : data?.length ? (
        <div className="covers">
          {data.map((s) => (
            <SubjectCover key={s.id} subject={s} />
          ))}
        </div>
      ) : (
        <Empty emoji="📚" title={`No subjects for class ${grade} yet`}>
          Try another class.
        </Empty>
      )}
    </>
  );
}
