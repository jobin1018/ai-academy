import { ArrowRight, Clock, Flame, Flag, Gauge, Layers, Play, Sparkles, Target } from 'lucide-react';
import { Link } from 'react-router-dom';
import { DAYS, LEVELS, bossForDay, getLevel } from '@/curriculum';
import { Badge, Bar, Card, EmptyState, LinkButton, Ring, SectionTitle, cx } from '@/components/ui/primitives';
import { completedDays, currentDay, dayStatus, hoursSummary, levelProgress, minutesRemaining, nextMilestone, overallPercent, resumeStep, skillProgress, streakInfo, totalXp, weekProgress } from '@/domain/progress';
import { STEPS } from '@/domain/types';
import { useApp, useProgress } from '@/store/context';

const hm = (min: number) => (min >= 60 ? `${Math.floor(min / 60)} h${min % 60 ? ` ${min % 60} min` : ''}` : `${min} min`);

function Stat({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-faint">{icon}{label}</div>
      <div className="mt-2 text-2xl font-semibold tracking-tight">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-muted">{sub}</div>}
    </Card>
  );
}

export function Timeline() {
  const data = useProgress();
  const cur = currentDay(data).day;
  return (
    <div className="space-y-4">
      {LEVELS.map((lv) => {
        const days = DAYS.filter((d) => d.level === lv.id);
        const lp = levelProgress(data, lv.id);
        return (
          <div key={lv.id}>
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="font-semibold" style={{ color: `var(--l${lv.id})` }}>Level {lv.id} · {lv.name}</span>
              <span className="text-muted">{lp.done}/{lp.total} days · Days {lv.firstDay}–{lv.lastDay}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {days.map((d) => {
                const st = dayStatus(data, d);
                const isCur = d.day === cur && !st.completed;
                const started = st.percent > 0;
                return (
                  <Link
                    key={d.day}
                    to={`/day/${d.day}`}
                    title={`Day ${d.day}: ${d.title}${st.completed ? ' (completed)' : ` (${st.percent}%)`}`}
                    aria-label={`Day ${d.day}, ${d.title}, ${st.completed ? 'completed' : st.percent + ' percent'}`}
                    className={cx(
                      'relative grid h-11 w-11 place-items-center rounded-xl border text-sm font-semibold transition hover:-translate-y-0.5 sm:h-12 sm:w-12',
                      st.completed ? 'border-transparent text-bg' : isCur ? 'border-2 text-ink' : started ? 'border-line2 bg-surface2 text-ink' : 'border-line bg-surface text-faint hover:text-ink',
                    )}
                    style={st.completed ? { background: `var(--l${lv.id})` } : isCur ? { borderColor: `var(--l${lv.id})`, background: 'var(--surface-2)' } : undefined}
                  >
                    {d.day}
                    {bossForDay(d.day) && d.bossFightId && <Flag size={10} className="absolute -right-1 -top-1 rounded-full bg-surface p-[2px]" style={{ color: `var(--l${lv.id})` }} />}
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function Dashboard() {
  const data = useProgress();
  const { mode } = useApp();
  const day = currentDay(data);
  const st = dayStatus(data, day);
  const lv = getLevel(day.level);
  const step = resumeStep(data, day);
  const done = completedDays(data).length;
  const xp = totalXp(data);
  const hrs = hoursSummary(data);
  const skills = skillProgress(data);
  const next = nextMilestone(data);
  const wk = weekProgress(data, Math.ceil(day.day / 7));
  const rhythm = streakInfo(data);
  const fresh = Object.keys(data.items).length === 0 && done === 0;
  const stepInfo = step === 'complete' ? null : STEPS.find((s) => s.id === step)!;
  const to = `/day/${day.day}/${step === 'complete' ? 'finish' : step}`;
  const allDone = done === 30;

  return (
    <div className="space-y-8">
      <header className="animate-rise">
        <p className="text-sm text-muted">{allDone ? 'All 30 missions complete.' : fresh ? 'Welcome. Your journey starts here.' : `Day ${day.day} of 30`}</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">Mission Control</h1>
      </header>

      {mode === 'local' && (
        <div className="rounded-xl border border-warn/30 bg-warnsoft px-4 py-3 text-sm">
          <strong>Local-only mode.</strong> Progress is saved in this browser only and will not appear on your other devices. Sign in from <Link to="/settings" className="font-medium text-accent underline">Settings</Link> (needs Supabase configured) to sync.
        </div>
      )}

      {/* Today's mission */}
      <section aria-labelledby="today" className="animate-rise">
        <Card className="relative overflow-hidden">
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full opacity-[0.14] blur-3xl" style={{ background: `var(--l${lv.id})` }} />
          <div className="relative p-5 sm:p-7">
            <div className="flex flex-wrap items-center gap-2">
              <SectionTitle id="today">{st.completed ? 'Latest mission' : "Today's mission"}</SectionTitle>
              <Badge className="-mt-3" tone="neutral"><span style={{ color: `var(--l${lv.id})` }}>Level {lv.id}</span></Badge>
              <Badge className="-mt-3">{day.dateLabel}</Badge>
              {day.bossFightId && <Badge className="-mt-3" tone="warn">Boss fight</Badge>}
            </div>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl"><span className="text-faint">Day {day.day}</span> {day.title}</h2>
            <p className="mt-2 max-w-3xl text-[15.5px] leading-relaxed text-muted">{day.objective}</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
              <div>
                <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted">
                  <span className="inline-flex items-center gap-1.5"><Clock size={14} className="text-faint" /> {day.plannedHours} h planned · ≈ {hm(minutesRemaining(data, day))} left</span>
                  <span className="inline-flex items-center gap-1.5"><Target size={14} className="text-faint" /> {st.mandatoryDone} done · {st.missing.length} remaining</span>
                  <span className="inline-flex items-center gap-1.5"><Gauge size={14} className="text-faint" /> {day.difficulty}</span>
                  <span className="inline-flex items-center gap-1.5"><Layers size={14} className="text-faint" /> {stepInfo ? `Now: step ${stepInfo.n}, ${stepInfo.title}` : 'All steps done'}</span>
                </div>
                <div className="mt-3 flex items-center gap-3"><Bar value={st.percent} color={`var(--l${lv.id})`} height={8} className="max-w-md" label="Today's progress" /><span className="text-sm font-semibold tabular-nums">{st.percent}%</span></div>
              </div>
              <div className="flex flex-wrap gap-2">
                <LinkButton to={to} variant="primary" size="lg"><Play size={16} fill="currentColor" /> {st.mandatoryDone > 0 || Object.keys(data.items).some((k) => k.startsWith(`d${String(day.day).padStart(2, '0')}.`)) ? 'Continue learning' : 'Start mission'}</LinkButton>
                <LinkButton to={`/day/${day.day}/focus`} variant="secondary" size="lg">Focus mode</LinkButton>
              </div>
            </div>
          </div>
        </Card>
      </section>

      {/* Journey stats */}
      <section aria-label="Your journey" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="col-span-2 flex items-center gap-4 p-4 lg:col-span-1">
          <Ring value={overallPercent(data)} size={72} stroke={7}><span className="text-base font-semibold">{overallPercent(data)}%</span></Ring>
          <div><div className="text-[11px] font-semibold uppercase tracking-wider text-faint">Overall</div><div className="text-sm text-muted">{done} of 30 missions completed</div></div>
        </Card>
        <Stat icon={<Sparkles size={13} />} label="XP" value={<>{xp}<span className="text-sm font-normal text-faint"> / 3000</span></>} sub="Derived from completed tasks" />
        <Stat icon={<Layers size={13} />} label="Current level" value={<span style={{ color: `var(--l${lv.id})` }}>{lv.id} · {lv.name.replace('The ', '')}</span>} sub={`Day ${day.day} of 30`} />
        <Stat icon={<Clock size={13} />} label="Focused hours" value={<>{hrs.actualHours.toFixed(1)}<span className="text-sm font-normal text-faint"> / {hrs.planned}</span></>} sub={hrs.actualHours ? `${hrs.plannedDone} h of plan completed` : 'Log time in Focus mode or the journal'} />
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        <Card className="p-5">
          <SectionTitle aside={<Link to="/skills" className="text-xs font-medium text-accent hover:underline">Skill tree</Link>}>Learning progress</SectionTitle>
          <p className="-mt-1 mb-4 text-xs text-muted">Two measures: <strong className="text-ink">tasks completed</strong> across the days that teach the skill, and what you have <strong className="text-ink">demonstrated independently</strong> (AI-free tasks done).</p>
          <ul className="space-y-4">
            {skills.map((s) => (
              <li key={s.id}>
                <div className="flex items-baseline justify-between gap-3 text-sm"><span className="font-medium">{s.name}</span><span className="text-xs text-muted tabular-nums">{s.taskPercent}% tasks · {s.demonstratedDone}/{s.demonstratedTotal} independent</span></div>
                <Bar className="mt-1.5" value={s.taskPercent} height={5} label={`${s.name} tasks`} />
                <Bar className="mt-1" value={s.demonstratedPercent} color="var(--iris)" height={5} label={`${s.name} independent`} />
              </li>
            ))}
          </ul>
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <SectionTitle>Next milestone</SectionTitle>
            {next ? (
              <>
                <div className="flex items-start gap-3"><Flag size={20} className="mt-0.5 text-warn" /><div><div className="font-semibold leading-snug">{next.title}</div><div className="text-sm text-muted">{next.detail}</div></div></div>
                <LinkButton to={`/boss/${bossForDay(next.day)?.id ?? 1}`} variant="secondary" size="sm" className="mt-3">View requirements <ArrowRight size={14} /></LinkButton>
              </>
            ) : <p className="text-sm text-muted">Every boss fight is passed.</p>}
          </Card>
          <Card className="p-5">
            <SectionTitle>This week</SectionTitle>
            <div className="flex items-end justify-between"><div className="text-2xl font-semibold">{wk.xp}<span className="text-sm font-normal text-faint"> XP</span></div><div className="text-right text-xs text-muted">Week {wk.week} · {wk.done}/{wk.total} days<br />{(wk.minutes / 60).toFixed(1)} h of {wk.plannedHours} h</div></div>
            <Bar className="mt-3" value={(100 * wk.done) / wk.total} height={5} />
            {data.settings.showStreak && <p className="mt-3 flex items-center gap-1.5 text-xs text-muted"><Flame size={13} className="text-l4" /> {rhythm.studyDays} study day{rhythm.studyDays === 1 ? '' : 's'} so far{rhythm.streak > 1 ? ` · ${rhythm.streak} in a row` : ''}. Gaps never cost you anything.</p>}
          </Card>
        </div>
      </section>

      <section>
        <SectionTitle aside={<Link to="/journey" className="text-xs font-medium text-accent hover:underline">Open journey map</Link>}>Milestone timeline · 30 days</SectionTitle>
        <Card className="p-5"><Timeline /></Card>
      </section>

      {fresh && <EmptyState icon={<Play size={30} />} title="Nothing recorded yet" action={<LinkButton to="/day/1" variant="primary">Start Day 1</LinkButton>}>Everything on this page is computed from the work you tick off. There is no sample data: it fills in as you complete tasks.</EmptyState>}
    </div>
  );
}
