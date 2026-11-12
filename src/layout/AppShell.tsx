import { BookOpen, Compass, Library, LayoutDashboard, Map as MapIcon, Play, Search, Settings, Sparkles, Trophy, CloudOff, CloudCheck, Cloud, RefreshCw, TriangleAlert } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { currentDay, dayStatus, resumeStep } from '@/domain/progress';
import { cx, LinkButton } from '@/components/ui/primitives';
import { useApp, useProgress, useSyncState } from '@/store/context';
import { SearchDialog } from './Search';
import { Toasts } from './Toasts';
import { getLevel } from '@/curriculum';

const NAV = [
  { to: '/', label: 'Mission Control', short: 'Home', icon: LayoutDashboard, end: true },
  { to: '/journey', label: 'Journey map', short: 'Journey', icon: MapIcon },
  { to: '/library', label: 'Resource library', short: 'Library', icon: Library },
  { to: '/journal', label: 'Learning journal', short: 'Journal', icon: BookOpen },
  { to: '/skills', label: 'Skills & achievements', short: 'Skills', icon: Trophy },
  { to: '/settings', label: 'Settings & export', short: 'Settings', icon: Settings },
] as const;

export function Logo({ compact }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <svg width="30" height="30" viewBox="0 0 64 64" aria-hidden>
        <rect width="64" height="64" rx="15" fill="var(--surface-2)" stroke="var(--line-strong)" />
        <path d="M32 12 50 46H14z" fill="none" stroke="var(--accent)" strokeWidth="5" strokeLinejoin="round" />
        <circle cx="32" cy="35" r="5" fill="var(--iris)" />
      </svg>
      {!compact && (
        <div className="leading-tight">
          <div className="text-[15px] font-semibold tracking-tight">AI Engineer Quest</div>
          <div className="text-[11px] text-faint">30 days · IncidentOps AI</div>
        </div>
      )}
    </div>
  );
}

export function SyncPill() {
  const { mode } = useApp();
  const s = useSyncState();
  if (mode === 'local') {
    return (
      <NavLink to="/settings" className="inline-flex items-center gap-1.5 rounded-full border border-warn/30 bg-warnsoft px-2.5 py-1 text-[11px] font-semibold text-warn" title="Progress is stored only in this browser. Sign in to sync across devices.">
        <CloudOff size={13} /> This device only
      </NavLink>
    );
  }
  const map = {
    idle: { icon: <Cloud size={13} />, text: 'Connecting…', cls: 'text-muted border-line bg-surface2' },
    syncing: { icon: <RefreshCw size={13} className="animate-spin" />, text: 'Saving…', cls: 'text-muted border-line bg-surface2' },
    synced: { icon: <CloudCheck size={13} />, text: 'Synced', cls: 'text-accent border-accent/25 bg-accentsoft' },
    offline: { icon: <CloudOff size={13} />, text: `Offline · ${s.pending} pending`, cls: 'text-warn border-warn/30 bg-warnsoft' },
    error: { icon: <TriangleAlert size={13} />, text: `Retrying · ${s.pending} pending`, cls: 'text-danger border-danger/30 bg-dangersoft' },
  }[s.status];
  return (
    <span className={cx('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold', map.cls)} title={s.error ?? undefined} role="status">
      {map.icon} {map.text}
    </span>
  );
}

function useContinueTarget() {
  const data = useProgress();
  const day = currentDay(data);
  const st = dayStatus(data, day);
  const step = resumeStep(data, day);
  const started = st.mandatoryDone > 0 || Object.keys(data.items).some((k) => k.startsWith(`d${String(day.day).padStart(2, '0')}.`));
  const to = `/day/${day.day}/${step === 'complete' ? 'finish' : step}`;
  return { day, to, started, completed: st.completed };
}

export function AppShell() {
  const [searchOpen, setSearchOpen] = useState(false);
  const loc = useLocation();
  const { day, to, started } = useContinueTarget();
  const lv = getLevel(day.level);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  useEffect(() => {
    window.scrollTo({ top: 0 }); // not returned: recent browsers return a Promise, which React rejects as a cleanup
  }, [loc.pathname]);

  const focus = /\/focus$/.test(loc.pathname);
  if (focus) {
    return (
      <>
        <Outlet />
        <Toasts />
      </>
    );
  }

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[264px_minmax(0,1fr)]">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line bg-surface/60 p-4 lg:flex">
        <div className="px-1 pb-5 pt-1"><Logo /></div>
        <button
          onClick={() => setSearchOpen(true)}
          className="mb-4 flex h-10 items-center gap-2 rounded-lg border border-line bg-surface2 px-3 text-sm text-faint transition hover:border-line2 hover:text-muted"
        >
          <Search size={15} /> Search
          <kbd className="ml-auto rounded border border-line px-1.5 text-[10px] font-medium">Ctrl K</kbd>
        </button>
        <nav aria-label="Main" className="flex flex-col gap-0.5">
          {NAV.map(({ to: p, label, icon: Icon, ...r }) => (
            <NavLink
              key={p}
              to={p}
              end={'end' in r}
              className={({ isActive }) =>
                cx('flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition', isActive ? 'bg-surface3 text-ink' : 'text-muted hover:bg-surface2 hover:text-ink')
              }
            >
              <Icon size={17} /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto space-y-3">
          <div className="rounded-xl border border-line bg-surface p-3.5">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider" style={{ color: `var(--l${lv.id})` }}>
              <Compass size={13} /> Day {day.day} · Level {lv.id}
            </div>
            <div className="mt-1 text-sm font-semibold leading-snug">{day.title}</div>
            <LinkButton to={to} variant="primary" size="md" className="mt-3 w-full">
              <Play size={15} fill="currentColor" /> {started ? 'Continue mission' : 'Start mission'}
            </LinkButton>
          </div>
          <div className="flex items-center justify-between px-1"><SyncPill /><NavLink to="/guide" className="text-xs text-faint hover:text-muted">Playbook guide</NavLink></div>
        </div>
      </aside>

      <div className="min-w-0 pb-24 lg:pb-10">
        {/* Mobile top bar */}
        <header className="pt-safe sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-line bg-bg/85 px-4 py-2.5 backdrop-blur lg:hidden">
          <NavLink to="/"><Logo compact /></NavLink>
          <div className="flex items-center gap-2">
            <SyncPill />
            <button onClick={() => setSearchOpen(true)} aria-label="Search" className="grid h-10 w-10 place-items-center rounded-lg border border-line bg-surface2 text-muted">
              <Search size={18} />
            </button>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1180px] px-4 py-6 sm:px-6 lg:px-10 lg:py-9">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav aria-label="Main" className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/92 backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-5">
          {[NAV[0], NAV[1]].map((n) => <MobileTab key={n.to} {...n} />)}
          <NavLink to={to} aria-label="Continue mission" className="relative grid place-items-center">
            <span className="-mt-5 grid h-14 w-14 place-items-center rounded-full bg-accent text-accentink shadow-[0_6px_22px_rgb(61_219_176/0.35)] ring-4 ring-bg">
              <Play size={22} fill="currentColor" />
            </span>
          </NavLink>
          {[NAV[2], NAV[3]].map((n) => <MobileTab key={n.to} {...n} />)}
          {/* The 5th slot above is the center CTA; the last two slots hold Skills/Settings via "More" */}
        </div>
        <MoreRow />
      </nav>

      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
      <Toasts />
    </div>
  );
}

function MobileTab({ to, short, icon: Icon, ...r }: { to: string; short: string; icon: typeof Sparkles; end?: boolean }) {
  return (
    <NavLink to={to} end={'end' in r && r.end} className={({ isActive }) => cx('flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-[11px] font-medium', isActive ? 'text-accent' : 'text-faint')}>
      <Icon size={20} /> {short}
    </NavLink>
  );
}

/** Secondary destinations on small screens, kept to one thin row so the main bar stays compact. */
function MoreRow(): ReactNode {
  return (
    <div className="flex items-center justify-center gap-6 border-t border-line/60 py-1.5 text-[11px] font-medium text-faint">
      <NavLink to="/skills" className={({ isActive }) => cx('flex items-center gap-1 px-2 py-1.5', isActive && 'text-accent')}><Trophy size={13} /> Skills</NavLink>
      <NavLink to="/settings" className={({ isActive }) => cx('flex items-center gap-1 px-2 py-1.5', isActive && 'text-accent')}><Settings size={13} /> Settings</NavLink>
      <NavLink to="/guide" className={({ isActive }) => cx('flex items-center gap-1 px-2 py-1.5', isActive && 'text-accent')}><Sparkles size={13} /> Guide</NavLink>
    </div>
  );
}
