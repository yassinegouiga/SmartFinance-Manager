import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import Icon from '../Icons/Icon';
import { useHeader } from '../../context/HeaderContext';
import { fmtMoney } from '../../utils/format';
import { ICON_CHOICES } from '../../utils/icons';

// ── Modal ────────────────────────────────────────────────────────────────────
export function Modal({ title, sub, onClose, children, footer, wide, icon, iconColor }) {
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <div className="overlay" onMouseDown={onClose}>
      <div className={'modal' + (wide ? ' wide' : '')} onMouseDown={(e) => e.stopPropagation()}>
        <div className="grabber" />
        <div className="modal-head">
          {icon && (
            <div className="cat-ic" style={{ background: (iconColor || 'var(--accent)') + '22', color: iconColor || 'var(--accent-2)' }}>
              <Icon name={icon} size={20} />
            </div>
          )}
          <div style={{ flex: 1 }}>
            <h3>{title}</h3>
            {sub && <div className="sub">{sub}</div>}
          </div>
          <button className="icon-btn plain" onClick={onClose} aria-label="Close">
            <Icon name="x" size={18} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

// ── Field wrappers ───────────────────────────────────────────────────────────
export function Field({ label, hint, error, children }) {
  return (
    <div className="field">
      {label && <label>{label}</label>}
      {children}
      {error
        ? <div className="err"><Icon name="alert" size={13} />{error}</div>
        : hint ? <div className="hint">{hint}</div>
        : null}
    </div>
  );
}

export function TextInput({ icon, error, affix, ...p }) {
  const input = <input className={'input' + (error ? ' has-err' : '') + (affix ? ' affixed' : '')} {...p} />;
  if (icon) return <div className="input-icon"><Icon name={icon} size={17} />{input}</div>;
  if (affix) return <div className="input-icon"><span className="input-affix">{affix}</span>{input}</div>;
  return input;
}

export function Textarea(p) {
  return <textarea className="textarea" {...p} />;
}

export function Select({ children, error, ...p }) {
  return (
    <div className="select-wrap">
      <select className={'select' + (error ? ' has-err' : '')} {...p}>{children}</select>
      <Icon name="chevronDown" size={16} />
    </div>
  );
}

export function Segmented({ value, onChange, options, accent }) {
  return (
    <div className={'segmented' + (accent ? ' accent' : '')}>
      {options.map(o => (
        <button key={o.value} type="button" className={value === o.value ? 'active' : ''} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({ on, onChange }) {
  return (
    <button type="button" className={'toggle' + (on ? ' on' : '')} onClick={() => onChange(!on)} aria-pressed={on} />
  );
}

export function IconPicker({ value, onChange, choices = ICON_CHOICES }) {
  return (
    <div className="row wrap" style={{ gap: 8 }}>
      {choices.map(name => {
        const active = value === name;
        return (
          <button
            key={name}
            type="button"
            className="icon-btn"
            onClick={() => onChange(name)}
            title={name}
            style={{
              width: 38, height: 38,
              borderColor: active ? 'var(--accent)' : 'var(--border)',
              background: active ? 'var(--accent-soft)' : 'var(--surface)',
              color: active ? 'var(--accent-2)' : 'var(--text-2)',
            }}
          >
            <Icon name={name} size={18} />
          </button>
        );
      })}
    </div>
  );
}

// ── Display ──────────────────────────────────────────────────────────────────
export function CatIcon({ cat, size = '' }) {
  if (!cat) return <div className={'cat-ic ' + size} style={{ background: 'var(--surface-3)' }} />;
  const color = cat.color || 'var(--accent)';
  const iconName = cat.icon || 'grid';
  const iconSize = size === 'sm' ? 16 : size === 'lg' ? 24 : 19;
  return (
    <div className={'cat-ic ' + size} style={{ background: color + '22', color }}>
      <Icon name={iconName} size={iconSize} />
    </div>
  );
}

export function Progress({ value, max = 100, color, thin, thick }) {
  const pct = Math.max(0, Math.min(100, (value / (max || 1)) * 100));
  const over = value > max;
  return (
    <div className={'progress' + (thin ? ' thin' : thick ? ' thick' : '')}>
      <span style={{
        width: pct + '%',
        background: over
          ? 'linear-gradient(90deg, var(--neg), #f43f5e)'
          : color ? `linear-gradient(90deg, ${color}, ${color})` : undefined,
      }} />
    </div>
  );
}

export function Avatar({ name, size = 38, src }) {
  const initials = (name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  return (
    <div className="avatar" style={{ width: size, height: size, fontSize: size * 0.36 }}>
      {src ? <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials}
    </div>
  );
}

export function Delta({ value, suffix }) {
  const up = value >= 0;
  return (
    <span className={'badge ' + (up ? 'badge-pos' : 'badge-neg')}>
      <Icon name={up ? 'trendUp' : 'trendDown'} size={13} />
      {up ? '+' : ''}{value}%{suffix ? ' ' + suffix : ''}
    </span>
  );
}

export function EmptyState({ icon = 'search', title, body, action }) {
  return (
    <div className="empty">
      <div className="ic"><Icon name={icon} size={28} /></div>
      <h3>{title}</h3>
      {body && <p>{body}</p>}
      {action}
    </div>
  );
}

export function Skeleton({ w, h = 16, r, style }) {
  return <div className="skel" style={{ width: w, height: h, borderRadius: r, ...style }} />;
}

export function Spinner({ lg }) {
  return <div className={'spinner' + (lg ? ' lg' : '')} />;
}

/**
 * Money — amount with sign coloring. Pass `cur` (ISO code); `type` of
 * 'income' / 'expense' or `signed` drives the +/− prefix and pos/neg color.
 */
export function Money({ amount, type, signed, cur = 'USD', className = '', strong }) {
  let cls = className + ' tnum';
  let prefix = '';
  if (type === 'income' || (signed && amount >= 0)) { cls += ' pos'; prefix = '+'; }
  else if (type === 'expense' || (signed && amount < 0)) { cls += ' neg'; prefix = '−'; }
  if (strong) cls += ' fw8';
  return <span className={cls}>{prefix}{fmtMoney(Math.abs(amount), cur)}</span>;
}

export function SearchInput({ value, onChange, placeholder = 'Search…' }) {
  return (
    <div className="input-icon" style={{ minWidth: 0 }}>
      <Icon name="search" size={17} />
      <input className="input" style={{ paddingLeft: 40 }} value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)} />
    </div>
  );
}

/**
 * PageHead — a page declares the topbar action buttons (and optional
 * title/sub override) by rendering this with the buttons as children.
 * Renders nothing itself; the shell's topbar reads the header descriptor.
 * `deps` lets a page refresh the actions when its own state changes.
 */
export function PageHead({ children, title, sub, deps }) {
  const { setHeader } = useHeader();
  useEffect(() => {
    setHeader({ title: title || null, sub: sub || null, actions: children || null });
    return () => setHeader(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, sub, ...(deps || [])]);
  return null;
}

// ── Toast ────────────────────────────────────────────────────────────────────
const ToastCtx = createContext(null);

export function useToast() {
  return useContext(ToastCtx);
}

export function ToastHost({ children }) {
  const [items, setItems] = useState([]);

  const push = useCallback((msg, type = 'pos') => {
    const id = Math.random().toString(36).slice(2);
    setItems(s => [...s, { id, msg, type }]);
    setTimeout(() => setItems(s => s.filter(t => t.id !== id)), 2800);
  }, []);

  const colors = {
    pos:  ['var(--pos-soft)',  'var(--pos)',  'checkCircle'],
    warn: ['var(--warn-soft)', 'var(--warn)', 'alert'],
    neg:  ['var(--neg-soft)',  'var(--neg)',  'alert'],
    info: ['var(--info-soft)', 'var(--info)', 'bell'],
  };

  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toasts">
        {items.map(t => {
          const [bg, fg, ic] = colors[t.type] || colors.pos;
          return (
            <div className="toast" key={t.id}>
              <div className="tic" style={{ background: bg, color: fg }}>
                <Icon name={ic} size={17} />
              </div>
              <span>{t.msg}</span>
            </div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
}

// ── Confirm dialog ─────────────────────────────────────────────────────────────
export function ConfirmDialog({ title, body, confirmLabel = 'Confirm', danger, onConfirm, onClose }) {
  return (
    <Modal
      title={title}
      onClose={onClose}
      icon={danger ? 'alert' : 'checkCircle'}
      iconColor={danger ? 'var(--neg)' : 'var(--accent-2)'}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className={'btn ' + (danger ? 'btn-danger' : 'btn-primary')} onClick={() => { onConfirm(); onClose(); }}>
            {confirmLabel}
          </button>
        </>
      }
    >
      <p className="muted" style={{ lineHeight: 1.55 }}>{body}</p>
    </Modal>
  );
}
