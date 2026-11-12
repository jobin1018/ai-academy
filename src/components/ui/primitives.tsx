import * as RCheckbox from '@radix-ui/react-checkbox';
import * as Collapsible from '@radix-ui/react-collapsible';
import { Check, ChevronDown, Copy, ExternalLink } from 'lucide-react';
import { useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

/* ----------------------------------- Button ----------------------------------- */
type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
const variants: Record<Variant, string> = {
  primary: 'bg-accent text-accentink hover:brightness-110 font-semibold shadow-[0_0_0_1px_rgb(255_255_255/0.06)_inset]',
  secondary: 'bg-surface2 text-ink border border-line hover:border-line2 hover:bg-surface3',
  ghost: 'text-muted hover:text-ink hover:bg-surface2',
  danger: 'bg-dangersoft text-danger border border-danger/30 hover:border-danger/60',
};
const sizes = { sm: 'h-8 px-3 text-[13px] gap-1.5', md: 'h-10 px-4 text-sm gap-2', lg: 'h-12 px-6 text-[15px] gap-2.5' };

interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: keyof typeof sizes;
}
export function Button({ variant = 'secondary', size = 'md', className, ...p }: BtnProps) {
  return (
    <button
      {...p}
      className={cx(
        'inline-flex items-center justify-center rounded-lg font-medium transition active:scale-[0.98] disabled:opacity-45 disabled:pointer-events-none select-none whitespace-nowrap',
        variants[variant],
        sizes[size],
        className,
      )}
    />
  );
}
export function LinkButton({ variant = 'secondary', size = 'md', className, ...p }: LinkProps & { variant?: Variant; size?: keyof typeof sizes }) {
  return (
    <Link
      {...p}
      className={cx('inline-flex items-center justify-center rounded-lg font-medium transition active:scale-[0.98] select-none whitespace-nowrap', variants[variant], sizes[size], className)}
    />
  );
}
export function ExtLink({ href, children, className, variant = 'secondary', size = 'sm' }: { href: string; children: ReactNode; className?: string; variant?: Variant; size?: keyof typeof sizes }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cx('inline-flex items-center justify-center rounded-lg font-medium transition active:scale-[0.98] select-none', variants[variant], sizes[size], className)}
    >
      {children}
      <ExternalLink size={14} aria-hidden className="opacity-70 shrink-0" />
    </a>
  );
}

/* ------------------------------------ Card ------------------------------------ */
export function Card({ className, children, ...p }: { className?: string; children: ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...p} className={cx('rounded-2xl border border-line bg-surface shadow-card', className)}>
      {children}
    </div>
  );
}

/* ------------------------------------ Badge ----------------------------------- */
const tones = {
  neutral: 'bg-surface3 text-muted border-line',
  accent: 'bg-accentsoft text-accent border-accent/25',
  iris: 'bg-irissoft text-iris border-iris/25',
  warn: 'bg-warnsoft text-warn border-warn/30',
  danger: 'bg-dangersoft text-danger border-danger/30',
};
export function Badge({ tone = 'neutral', children, className, title }: { tone?: keyof typeof tones; children: ReactNode; className?: string; title?: string }) {
  return (
    <span title={title} className={cx('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold tracking-wide uppercase leading-5', tones[tone], className)}>
      {children}
    </span>
  );
}

/* --------------------------------- Progress bar -------------------------------- */
export function Bar({ value, color = 'var(--accent)', className, label, height = 6 }: { value: number; color?: string; className?: string; label?: string; height?: number }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(v)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cx('w-full overflow-hidden rounded-full bg-surface3', className)}
      style={{ height }}
    >
      <div className="h-full rounded-full transition-[width] duration-500 ease-out" style={{ width: `${v}%`, background: color }} />
    </div>
  );
}

export function Ring({ value, size = 64, stroke = 6, color = 'var(--accent)', children }: { value: number; size?: number; stroke?: number; color?: string; children?: ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={`${Math.round(v)} percent`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - v / 100)} className="transition-[stroke-dashoffset] duration-700 ease-out" />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}

/* ----------------------------------- Checkbox ---------------------------------- */
export function Check_({ checked, onChange, label, className, disabled, id }: { checked: boolean; onChange: (v: boolean) => void; label?: ReactNode; className?: string; disabled?: boolean; id?: string }) {
  return (
    <label className={cx('flex items-start gap-3 cursor-pointer select-none min-h-[44px] items-center', disabled && 'opacity-50 pointer-events-none', className)}>
      <RCheckbox.Root
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={(v) => onChange(v === true)}
        className="grid h-6 w-6 shrink-0 place-items-center rounded-md border border-line2 bg-surface2 transition data-[state=checked]:border-accent data-[state=checked]:bg-accent"
      >
        <RCheckbox.Indicator className="animate-pop">
          <Check size={15} strokeWidth={3.2} className="text-accentink" />
        </RCheckbox.Indicator>
      </RCheckbox.Root>
      {label && <span className="text-sm leading-snug">{label}</span>}
    </label>
  );
}

/* --------------------------------- Autosave text -------------------------------- */
/**
 * Textarea that edits locally, commits to the store after a short pause and on blur/unmount, and
 * re-syncs when the stored value changes from elsewhere (another device, import).
 */
export function AutoText({
  value,
  onCommit,
  placeholder,
  rows = 4,
  className,
  label,
  mono,
  ariaLabel,
  delay = 500,
}: {
  value: string;
  onCommit: (v: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  label?: string;
  mono?: boolean;
  ariaLabel?: string;
  delay?: number;
}) {
  const [local, setLocal] = useState(value);
  const [saved, setSaved] = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef({ local, value, onCommit });
  latest.current = { local, value, onCommit };
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current && value !== latest.current.local) setLocal(value);
  }, [value]);

  const commit = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (latest.current.local !== latest.current.value) latest.current.onCommit(latest.current.local);
    setSaved(true);
  };
  useEffect(
    () => () => {
      if (timer.current) {
        clearTimeout(timer.current);
        if (latest.current.local !== latest.current.value) latest.current.onCommit(latest.current.local);
      }
    },
    [],
  );

  return (
    <div className={className}>
      {label && <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-muted"><span>{label}</span><span className={cx('text-[11px] transition-opacity', saved ? 'opacity-60' : 'opacity-100 text-warn')}>{saved ? (local ? 'Saved' : '') : 'Saving…'}</span></div>}
      <textarea
        aria-label={ariaLabel ?? label}
        value={local}
        rows={rows}
        placeholder={placeholder}
        onFocus={() => (focused.current = true)}
        onBlur={() => {
          focused.current = false;
          commit();
        }}
        onChange={(e) => {
          setLocal(e.target.value);
          setSaved(false);
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(commit, delay);
        }}
        className={cx(
          'w-full resize-y rounded-xl border border-line bg-surface2 px-3.5 py-3 text-[14.5px] leading-relaxed text-ink placeholder:text-faint transition focus:border-accent/60 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-accent/20',
          mono && 'font-mono text-[13px]',
        )}
      />
    </div>
  );
}

export function AutoLine({ value, onCommit, placeholder, label, type = 'text', inputMode }: { value: string; onCommit: (v: string) => void; placeholder?: string; label: string; type?: string; inputMode?: 'numeric' | 'url' | 'text' }) {
  const [local, setLocal] = useState(value);
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setLocal(value);
  }, [value]);
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted">{label}</span>
      <input
        type={type}
        inputMode={inputMode}
        value={local}
        placeholder={placeholder}
        onFocus={() => (focused.current = true)}
        onBlur={() => {
          focused.current = false;
          if (local !== value) onCommit(local);
        }}
        onChange={(e) => {
          setLocal(e.target.value);
          if (type !== 'url') onCommit(e.target.value);
        }}
        className="h-11 w-full rounded-xl border border-line bg-surface2 px-3.5 text-[14.5px] text-ink placeholder:text-faint transition focus:border-accent/60 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-accent/20"
      />
    </label>
  );
}

/* ------------------------------- Copy + code block ------------------------------ */
export function CopyButton({ text, label = 'Copy', className }: { text: string; label?: string; className?: string }) {
  const [ok, setOk] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    setOk(true);
    setTimeout(() => setOk(false), 1600);
  };
  return (
    <button
      type="button"
      onClick={copy}
      className={cx('inline-flex h-8 items-center gap-1.5 rounded-md border border-line bg-surface2 px-2.5 text-xs font-medium text-muted transition hover:border-line2 hover:text-ink', className)}
      aria-live="polite"
    >
      {ok ? <Check size={14} className="text-accent" /> : <Copy size={14} />}
      {ok ? 'Copied' : label}
    </button>
  );
}

export function CodeBlock({ code, title, extra, copyLabel }: { code: string; title?: string; extra?: ReactNode; copyLabel?: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-bg">
      <div className="flex items-center justify-between gap-2 border-b border-line bg-surface px-3 py-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-faint">{title ?? 'Command'}</span>
        <div className="flex items-center gap-1.5">
          {extra}
          <CopyButton text={code} label={copyLabel} />
        </div>
      </div>
      <pre className="overflow-x-auto p-3.5 font-mono text-[12.5px] leading-relaxed text-ink whitespace-pre-wrap break-words">{code}</pre>
    </div>
  );
}

/* ------------------------------- Disclosure ------------------------------------ */
export function Disclosure({ title, children, defaultOpen = false, badge, tone }: { title: ReactNode; children: ReactNode; defaultOpen?: boolean; badge?: ReactNode; tone?: 'warn' }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible.Root open={open} onOpenChange={setOpen} className={cx('rounded-xl border bg-surface2/50', tone === 'warn' ? 'border-warn/30' : 'border-line')}>
      <Collapsible.Trigger className="flex w-full min-h-[44px] items-center justify-between gap-3 px-4 py-2.5 text-left text-sm font-medium">
        <span className="flex items-center gap-2">{title}{badge}</span>
        <ChevronDown size={16} className={cx('shrink-0 text-faint transition-transform', open && 'rotate-180')} />
      </Collapsible.Trigger>
      <Collapsible.Content className="px-4 pb-4 pt-1">{children}</Collapsible.Content>
    </Collapsible.Root>
  );
}

export function EmptyState({ icon, title, children, action }: { icon?: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="grid place-items-center rounded-2xl border border-dashed border-line2 bg-surface/50 px-6 py-12 text-center">
      {icon && <div className="mb-3 text-faint">{icon}</div>}
      <h3 className="text-base font-semibold">{title}</h3>
      {children && <p className="mt-1.5 max-w-md text-sm text-muted">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function SectionTitle({ children, aside, id }: { children: ReactNode; aside?: ReactNode; id?: string }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <h2 id={id} className="text-[13px] font-semibold uppercase tracking-[0.12em] text-faint">{children}</h2>
      {aside}
    </div>
  );
}
