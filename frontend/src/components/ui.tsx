import { cloneElement, isValidElement, useEffect, useId, useState, type CSSProperties, type ReactElement, type ReactNode } from 'react';
import { AlertCircle, X } from 'lucide-react';

export function Loader({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="loader" role="status">
      <span className="dots" aria-hidden>
        <span />
        <span />
        <span />
      </span>
      {label}
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="alert" role="alert">
      <AlertCircle size={18} style={{ flex: 'none', marginTop: 2 }} />
      <div className="spacer">{message}</div>
      {onRetry && (
        <button className="btn sm danger" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

export function Empty({ emoji, title, children }: { emoji: string; title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <div className="emoji" aria-hidden>
        {emoji}
      </div>
      <h3>{title}</h3>
      {children && <div className="small">{children}</div>}
    </div>
  );
}

export function Ring({
  value,
  size = 120,
  stroke = 12,
  tone = 'var(--mint-deep)',
  track = 'var(--paper)',
  label,
}: {
  value: number;
  size?: number;
  stroke?: number;
  tone?: string;
  track?: string;
  label?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={tone}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (v / 100) * c}
        />
      </svg>
      <div className="ring-value" style={{ fontSize: size * 0.24 }}>
        {Math.round(v)}%{label && <small>{label}</small>}
      </div>
    </div>
  );
}

export function Modal({
  title,
  subtitle,
  onClose,
  wide,
  children,
}: {
  title: string;
  subtitle?: ReactNode;
  onClose: () => void;
  wide?: boolean;
  children: ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal${wide ? ' wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <div>
            <h2>{title}</h2>
            {subtitle && <p className="muted small" style={{ marginTop: 4 }}>{subtitle}</p>}
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Lightweight toast: const [toast, show] = useToast(); ... {toast} */
export function useToast(): [ReactNode, (msg: string) => void] {
  const [msg, setMsg] = useState('');
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(''), 2800);
    return () => clearTimeout(t);
  }, [msg]);
  const node = msg ? (
    <div className="toast" role="status">
      {msg}
    </div>
  ) : null;
  return [node, setMsg];
}

/**
 * Label + control linked by id (not by wrapping), so a <select>'s accessible
 * name is just the label, not the label plus every option.
 */
export function Field({
  label,
  hint,
  style,
  children,
}: {
  label: string;
  hint?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const id = useId();
  const hintId = `${id}-hint`;
  // The control is either the direct child or the first input/select inside an .input-wrap
  const link = (node: ReactNode): ReactNode => {
    if (!isValidElement(node)) return node;
    const el = node as ReactElement<Record<string, unknown>>;
    if (typeof el.type === 'string' && ['input', 'select', 'textarea'].includes(el.type)) {
      return cloneElement(el, { id, 'aria-describedby': hint ? hintId : undefined });
    }
    const kids = el.props.children as ReactNode;
    if (kids === undefined) return el;
    let done = false;
    const mapped = (Array.isArray(kids) ? kids : [kids]).map((k, i) => {
      if (done || !isValidElement(k)) return k;
      const kt = (k as ReactElement).type;
      if (typeof kt === 'string' && ['input', 'select', 'textarea'].includes(kt)) {
        done = true;
        return cloneElement(k as ReactElement<Record<string, unknown>>, { id, key: i, 'aria-describedby': hint ? hintId : undefined });
      }
      return k;
    });
    return cloneElement(el, {}, ...mapped);
  };

  return (
    <div className="field" style={style}>
      <label htmlFor={id}>{label}</label>
      {link(children)}
      {hint && <small id={hintId}>{hint}</small>}
    </div>
  );
}
