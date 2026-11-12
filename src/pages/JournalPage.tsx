import { Check, Search } from 'lucide-react';
import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DAYS, getDay } from '@/curriculum';
import { Card, EmptyState, cx } from '@/components/ui/primitives';
import { JournalFields } from '@/components/mission/JournalFields';
import { currentDay } from '@/domain/progress';
import { useProgress } from '@/store/context';
import type { JournalEntry } from '@/domain/types';

const filled = (j?: JournalEntry) => !!j && Object.entries(j).some(([k, v]) => k !== 'updatedAt' && typeof v === 'string' && v.trim());

export default function JournalPage() {
  const data = useProgress();
  const [sp, setSp] = useSearchParams();
  const q = (sp.get('q') ?? '').toLowerCase().trim();
  const dayNo = Number(sp.get('day')) || currentDay(data).day;
  const day = getDay(dayNo) ?? DAYS[0];
  const pick = (n: number) => { const x = new URLSearchParams(sp); x.set('day', String(n)); setSp(x, { replace: true }); };

  const list = useMemo(
    () => DAYS.filter((d) => {
      if (!q) return true;
      const j = data.journal[d.day];
      return d.title.toLowerCase().includes(q) || (!!j && Object.values(j).some((v) => typeof v === 'string' && v.toLowerCase().includes(q)));
    }),
    [data.journal, q],
  );
  const total = DAYS.filter((d) => filled(data.journal[d.day])).length;

  return (
    <div className="space-y-6">
      <header className="animate-rise">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Learning journal</h1>
        <p className="mt-2 max-w-2xl text-muted">One entry per day. It saves as you type and syncs with the rest of your progress. {total ? `${total} of 30 days have an entry.` : 'Nothing written yet.'}</p>
      </header>
      <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
        <div className="space-y-3">
          <label className="relative block">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
            <input value={sp.get('q') ?? ''} onChange={(e) => { const x = new URLSearchParams(sp); e.target.value ? x.set('q', e.target.value) : x.delete('q'); setSp(x, { replace: true }); }} placeholder="Search entries…" aria-label="Search journal" className="h-10 w-full rounded-lg border border-line bg-surface2 pl-9 pr-3 text-sm placeholder:text-faint focus:border-accent/60 focus:outline-none" />
          </label>
          <label className="block lg:hidden">
            <span className="sr-only">Choose a day</span>
            <select value={day.day} onChange={(e) => pick(Number(e.target.value))} className="h-11 w-full rounded-lg border border-line bg-surface2 px-3 text-sm">
              {list.map((d) => <option key={d.day} value={d.day}>Day {d.day} · {d.title}{filled(data.journal[d.day]) ? ' ✓' : ''}</option>)}
            </select>
          </label>
          <nav aria-label="Journal days" className="hidden max-h-[70vh] overflow-y-auto rounded-2xl border border-line bg-surface p-1.5 lg:block">
            {list.map((d) => (
              <button key={d.day} onClick={() => pick(d.day)} aria-current={d.day === day.day} className={cx('flex min-h-10 w-full items-center gap-2.5 rounded-lg px-3 py-1.5 text-left text-sm', d.day === day.day ? 'bg-surface3 text-ink' : 'text-muted hover:bg-surface2')}>
                <span className="w-6 shrink-0 font-mono text-xs text-faint">{d.day}</span>
                <span className="min-w-0 flex-1 truncate">{d.title}</span>
                {filled(data.journal[d.day]) && <Check size={14} className="shrink-0 text-accent" />}
              </button>
            ))}
            {list.length === 0 && <div className="px-3 py-6 text-center text-sm text-muted">No entries match.</div>}
          </nav>
        </div>
        <Card className="p-5 sm:p-6">
          <div className="mb-5">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-faint">{day.dateLabel} · Level {day.level}</div>
            <h2 className="text-xl font-semibold">Day {day.day}: {day.title}</h2>
          </div>
          {list.length === 0 ? <EmptyState title="No matching day" /> : <JournalFields key={day.day} day={day.day} />}
        </Card>
      </div>
    </div>
  );
}
