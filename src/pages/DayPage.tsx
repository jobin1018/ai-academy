import { ArrowLeft, ArrowRight, CheckCircle2, Clock, Focus, Gauge, Sparkles } from 'lucide-react';
import { useEffect } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { DAYS, getDay, getLevel } from '@/curriculum';
import type { Day } from '@/curriculum/schema';
import { Badge, Bar, Card, LinkButton, Ring } from '@/components/ui/primitives';
import { dayStatus, minutesRemaining, resumeStep } from '@/domain/progress';
import { STEPS, type StepId } from '@/domain/types';
import { useProgress, useStore } from '@/store/context';
import { ChallengeStep, DebriefStep, TestStep } from '@/components/mission/TestChallengeDebrief';
import { BuildStep, DesignStep } from '@/components/mission/DesignBuildSteps';
import { FinishStep, Overview } from '@/components/mission/FinishOverview';
import { LearnStep } from '@/components/mission/LearnStep';
import { StepNav } from '@/components/mission/shared';

export const STEP_IDS = STEPS.map((s) => s.id) as string[];

export function StepContent({ day, step, base }: { day: Day; step: string; base: string }) {
  switch (step) {
    case 'learn': return <LearnStep day={day} />;
    case 'design': return <DesignStep day={day} />;
    case 'build': return <BuildStep day={day} />;
    case 'test': return <TestStep day={day} />;
    case 'challenge': return <ChallengeStep day={day} />;
    case 'debrief': return <DebriefStep day={day} />;
    case 'finish': return <FinishStep day={day} base={base} />;
    default: return <Overview day={day} base={base} />;
  }
}

const hm = (min: number) => (min >= 60 ? `${Math.floor(min / 60)} h ${min % 60 ? `${min % 60} min` : ''}` : `${min} min`);

function DayHeader({ day }: { day: Day }) {
  const data = useProgress();
  const st = dayStatus(data, day);
  const lv = getLevel(day.level);
  const rem = minutesRemaining(data, day);
  return (
    <header className="animate-rise">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Link to="/journey" className="inline-flex items-center gap-1 text-muted hover:text-ink"><ArrowLeft size={14} /> Journey</Link>
        <span className="text-line2">/</span>
        <span className="font-semibold uppercase tracking-wider" style={{ color: `var(--l${lv.id})` }}>Level {lv.id} · {lv.name}</span>
        <span className="text-line2">/</span>
        <span className="text-faint">{day.dateLabel}</span>
      </div>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-[28px] font-semibold leading-tight tracking-tight sm:text-4xl"><span className="text-faint">Day {day.day}</span> {day.title}</h1>
          <p className="mt-2.5 max-w-3xl text-[15.5px] leading-relaxed text-muted">{day.objective}</p>
        </div>
        <Ring value={st.percent} size={78} stroke={7} color={st.completed ? 'var(--accent)' : `var(--l${lv.id})`}>
          <span className="text-base font-semibold leading-none">{st.percent}%</span>
          <span className="text-[9px] uppercase tracking-wider text-faint">done</span>
        </Ring>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Badge><Gauge size={11} /> {day.difficulty}</Badge>
        <Badge><Clock size={11} /> {day.plannedHours} h · {day.learnHours} h learning</Badge>
        <Badge tone="accent"><Sparkles size={11} /> {st.xp.total} / 100 XP</Badge>
        {st.completed ? <Badge tone="accent"><CheckCircle2 size={11} /> Completed</Badge> : <Badge>≈ {hm(rem)} left</Badge>}
        {day.bossFightId && <Badge tone="warn">Boss fight {day.bossFightId}</Badge>}
        <LinkButton to={`/day/${day.day}/focus`} variant="secondary" size="sm" className="ml-auto"><Focus size={14} /> Focus mode</LinkButton>
      </div>
    </header>
  );
}

function Rail({ day, base }: { day: Day; base: string }) {
  const data = useProgress();
  const st = dayStatus(data, day);
  return (
    <aside className="hidden xl:block">
      <Card className="sticky top-6 p-4">
        <div className="flex items-center justify-between"><h3 className="text-sm font-semibold">Mission progress</h3><span className="text-xs text-muted">{st.xp.total}/100 XP</span></div>
        <Bar className="mt-3" value={st.percent} height={7} label="Mission progress" />
        <div className="mt-2 flex justify-between text-xs text-muted"><span>{st.mandatoryDone} done</span><span>{st.missing.length} remaining</span></div>
        {st.missing.length > 0 && (
          <div className="mt-4">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-faint">Mandatory, still open</div>
            <ul className="mt-2 space-y-1.5">
              {st.missing.slice(0, 6).map((m) => (
                <li key={m.key + m.step} className="text-[13px] leading-snug text-muted">
                  <Link to={m.step === 'verify' ? `${base}/finish` : `${base}/${m.step}`} className="hover:text-ink">· {m.label}</Link>
                </li>
              ))}
              {st.missing.length > 6 && <li className="text-xs text-faint">+ {st.missing.length - 6} more</li>}
            </ul>
          </div>
        )}
        <LinkButton to={`${base}/finish`} variant={st.canComplete ? 'primary' : 'secondary'} className="mt-4 w-full">{st.completed ? 'Completed' : st.canComplete ? 'Complete mission' : 'Open checklist'}</LinkButton>
      </Card>
    </aside>
  );
}

export default function DayPage() {
  const { n, step = '' } = useParams();
  const store = useStore();
  const data = useProgress();
  const day = getDay(Number(n));
  const valid = step === '' || STEP_IDS.includes(step) || step === 'finish';

  useEffect(() => {
    if (!day) return;
    const s = data.settings;
    const stepId = (STEP_IDS.includes(step) ? step : null) as StepId | null;
    if (s.lastDay !== day.day || (stepId && s.lastStep !== stepId)) store.setSettings({ lastDay: day.day, ...(stepId ? { lastStep: stepId } : {}) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day?.day, step]);

  if (!day) return <Navigate to="/journey" replace />;
  if (!valid) return <Navigate to={`/day/${day.day}`} replace />;
  const base = `/day/${day.day}`;
  const st = dayStatus(data, day);
  const next = DAYS[day.day];
  const idx = ['', ...STEP_IDS, 'finish'].indexOf(step);
  const order = ['', ...STEP_IDS, 'finish'];
  const prevStep = order[idx - 1];
  const nextStep = order[idx + 1];
  const resume = resumeStep(data, day);

  return (
    <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_280px] xl:gap-8">
      <div className="min-w-0 space-y-5">
        <DayHeader day={day} />
        <div className="sticky top-[57px] z-20 -mx-1 bg-bg/90 px-1 py-2 backdrop-blur lg:top-0"><StepNav day={day} data={data} current={step} base={base} /></div>
        {step === '' && !st.completed && (
          <Card className="flex flex-wrap items-center justify-between gap-3 border-accent/25 bg-gradient-to-r from-accentsoft to-transparent p-4">
            <div className="text-sm"><strong>{resume === 'complete' ? 'Everything is done.' : 'Pick up where you stopped:'}</strong> <span className="text-muted">{resume === 'complete' ? 'Close the mission from the Finish tab.' : `Step ${STEPS.find((s) => s.id === resume)!.n}, ${STEPS.find((s) => s.id === resume)!.title}`}</span></div>
            <LinkButton to={resume === 'complete' ? `${base}/finish` : `${base}/${resume}`} variant="primary">Continue <ArrowRight size={15} /></LinkButton>
          </Card>
        )}
        <div key={step} className="animate-rise"><StepContent day={day} step={step} base={base} /></div>
        <nav className="flex items-center justify-between gap-3 border-t border-line pt-5" aria-label="Previous and next step">
          {prevStep !== undefined ? <LinkButton to={prevStep ? `${base}/${prevStep}` : base} variant="ghost"><ArrowLeft size={15} /> Back</LinkButton> : <span />}
          {nextStep !== undefined ? (
            <LinkButton to={`${base}/${nextStep}`} variant="secondary">Next: {nextStep === 'finish' ? 'Finish' : STEPS.find((s) => s.id === nextStep)?.short} <ArrowRight size={15} /></LinkButton>
          ) : next ? (
            <LinkButton to={`/day/${next.day}`} variant="secondary">Day {next.day} <ArrowRight size={15} /></LinkButton>
          ) : <span />}
        </nav>
      </div>
      <Rail day={day} base={base} />
    </div>
  );
}
