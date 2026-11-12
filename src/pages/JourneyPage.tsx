import { Check, Flag, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ACHIEVEMENTS, DAYS, LEVELS } from '@/curriculum';
import { Badge, Bar, Card, cx } from '@/components/ui/primitives';
import { currentDay, dayStatus, levelProgress } from '@/domain/progress';
import { useProgress } from '@/store/context';

/** The four-level roadmap. Every day stays open: you can revisit any day without losing progress. */
export default function JourneyPage() {
  const data = useProgress();
  const cur = currentDay(data).day;
  return (
    <div className="space-y-8">
      <header className="animate-rise">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Journey map</h1>
        <p className="mt-2 max-w-2xl text-muted">Thirty missions in four levels, 179 focused hours. Completed days are filled; the current day is outlined. Any day can be reopened at any time.</p>
      </header>
      {LEVELS.map((lv) => {
        const lp = levelProgress(data, lv.id);
        const days = DAYS.filter((d) => d.level === lv.id);
        const badges = ACHIEVEMENTS.filter((a) => a.days.some((d) => d >= lv.firstDay && d <= lv.lastDay));
        return (
          <section key={lv.id} aria-labelledby={`lv${lv.id}`} className="animate-rise">
            <Card className="overflow-hidden">
              <div className="relative border-b border-line p-5 sm:p-6">
                <div className="pointer-events-none absolute -left-10 -top-10 h-40 w-40 rounded-full opacity-[0.13] blur-3xl" style={{ background: `var(--l${lv.id})` }} />
                <div className="relative flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 max-w-2xl">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: `var(--l${lv.id})` }}>Level {lv.id} · Days {lv.firstDay}–{lv.lastDay} · {lv.plannedHours} h</div>
                    <h2 id={`lv${lv.id}`} className="mt-1 text-2xl font-semibold tracking-tight">{lv.name}</h2>
                    <p className="mt-2 text-sm text-muted">{lv.tagline}</p>
                    <p className="mt-2 text-sm"><span className="text-faint">You finish with: </span>{lv.finishWith}</p>
                  </div>
                  <div className="w-full sm:w-52">
                    <div className="flex justify-between text-xs text-muted"><span>{lp.done}/{lp.total} days</span><span>{lp.xp}/{lp.maxXp} XP</span></div>
                    <Bar className="mt-2" value={lp.percent} color={`var(--l${lv.id})`} height={7} label={`Level ${lv.id} progress`} />
                    <div className="mt-2 text-right text-xs font-semibold tabular-nums" style={{ color: `var(--l${lv.id})` }}>{lp.percent}%</div>
                  </div>
                </div>
              </div>
              <ol className="divide-y divide-line/70">
                {days.map((d) => {
                  const st = dayStatus(data, d);
                  const isCur = d.day === cur && !st.completed;
                  return (
                    <li key={d.day}>
                      <Link to={`/day/${d.day}`} className={cx('flex min-h-[64px] items-center gap-3.5 px-5 py-3 transition hover:bg-surface2/60 sm:px-6', isCur && 'bg-surface2/50')}>
                        <span
                          className={cx('grid h-10 w-10 shrink-0 place-items-center rounded-xl border text-sm font-semibold', st.completed ? 'border-transparent text-bg' : isCur ? 'border-2 text-ink' : 'border-line text-faint')}
                          style={st.completed ? { background: `var(--l${lv.id})` } : isCur ? { borderColor: `var(--l${lv.id})` } : undefined}
                        >
                          {st.completed ? <Check size={18} strokeWidth={3} /> : d.day}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="text-[15px] font-medium leading-snug">{d.title}</span>
                            {d.bossFightId && <Badge tone="warn"><Flag size={10} /> Boss {d.bossFightId}</Badge>}
                            {isCur && <Badge tone="accent">Current</Badge>}
                          </span>
                          <span className="block truncate text-xs text-muted">{d.dateLabel} · {d.plannedHours} h · {d.difficulty}</span>
                        </span>
                        <span className="hidden w-28 shrink-0 sm:block">
                          <Bar value={st.percent} color={st.completed ? `var(--l${lv.id})` : 'var(--iris)'} height={4} />
                          <span className="mt-1 block text-right text-[11px] tabular-nums text-faint">{st.xp.total} XP</span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ol>
              {badges.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 border-t border-line bg-surface2/30 px-5 py-3 sm:px-6">
                  <span className="text-xs text-faint">Badges in this level:</span>
                  {badges.map((a) => <Badge key={a.id} tone={a.id in data.unlocks ? 'accent' : 'neutral'}>{a.id in data.unlocks ? '' : <Lock size={10} />}{a.name}</Badge>)}
                </div>
              )}
            </Card>
          </section>
        );
      })}
    </div>
  );
}
