import { Award, X } from 'lucide-react';
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ACHIEVEMENTS } from '@/curriculum';
import { useApp } from '@/store/context';

/** Quiet, professional notice when a real deliverable unlocks an achievement. */
export function Toasts() {
  const { newlyUnlocked, dismissUnlocked } = useApp();
  useEffect(() => {
    if (!newlyUnlocked.length) return;
    const t = setTimeout(dismissUnlocked, 7000);
    return () => clearTimeout(t);
  }, [newlyUnlocked, dismissUnlocked]);
  if (!newlyUnlocked.length) return null;
  const items = newlyUnlocked.map((id) => ACHIEVEMENTS.find((a) => a.id === id)).filter(Boolean);
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex justify-center px-4 lg:bottom-8 lg:justify-end lg:pr-8" role="status" aria-live="polite">
      <div className="pointer-events-auto relative w-full max-w-sm overflow-hidden rounded-2xl border border-accent/35 bg-surface p-4 shadow-card animate-rise">
        <div className="pointer-events-none absolute inset-y-0 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" style={{ animation: 'sheen 1.4s ease-out 0.2s both' }} />
        <button onClick={dismissUnlocked} aria-label="Dismiss" className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-md text-faint hover:text-ink"><X size={15} /></button>
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accentsoft text-accent animate-pop"><Award size={20} /></span>
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-accent">Achievement unlocked</div>
            {items.map((a) => <div key={a!.id} className="text-[15px] font-semibold leading-snug">{a!.name}</div>)}
            <div className="mt-0.5 text-xs text-muted">{items[0]?.evidence}</div>
            <Link to="/skills" className="mt-1.5 inline-block text-xs font-medium text-accent hover:underline">See all achievements</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
