import { ArrowLeft, ArrowRight, Pause, Play, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { getDay } from '@/curriculum';
import { Bar, Button, cx } from '@/components/ui/primitives';
import { dayStatus, resumeStep, stepProgress } from '@/domain/progress';
import { STEPS } from '@/domain/types';
import { useProgress, useStore } from '@/store/context';
import { StepContent } from './DayPage';

const ORDER = [...STEPS.map((s) => s.id as string), 'finish'];
const clock = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

/** Distraction-free, one-step-at-a-time view with an optional timer that logs focused minutes. */
export default function FocusPage() {
  const { n } = useParams();
  const [sp, setSp] = useSearchParams();
  const nav = useNavigate();
  const store = useStore();
  const data = useProgress();
  const day = getDay(Number(n));
  const [running, setRunning] = useState(false);
  const [secs, setSecs] = useState(0);
  const logged = useRef(0);
  const dayNo = day?.day;

  useEffect(() => {
    if (!running || !dayNo) return;
    const t = setInterval(() => {
      setSecs((s) => {
        const next = s + 1;
        if (next % 60 === 0) {
          // persist each full minute so a closed tab never loses the time
          const cur = store.getSnapshot().days[dayNo]?.minutesSpent ?? 0;
          store.setDay(dayNo, { minutesSpent: Math.min(1440, cur + 1) });
          logged.current += 1;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [running, dayNo, store]);

  if (!day) return <Navigate to="/journey" replace />;
  const resume = resumeStep(data, day);
  const step = sp.get('s') ?? (resume === 'complete' ? 'finish' : resume);
  const i = ORDER.indexOf(step);
  const go = (s: string) => setSp({ s }, { replace: true });
  const st = dayStatus(data, day);
  const base = `/day/${day.day}`;

  return (
    <div className="min-h-dvh bg-bg">
      <header className="pt-safe sticky top-0 z-30 border-b border-line bg-bg/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-2.5">
          <Button variant="ghost" size="sm" onClick={() => nav(`${base}/${step === 'finish' ? 'finish' : step}`)} aria-label="Exit focus mode"><X size={16} /> Exit</Button>
          <div className="min-w-0 flex-1 text-center"><div className="truncate text-xs font-semibold text-muted">Day {day.day} · {day.title}</div></div>
          <button
            onClick={() => setRunning((r) => !r)}
            className={cx('flex h-9 items-center gap-1.5 rounded-lg border px-2.5 font-mono text-[13px] tabular-nums', running ? 'border-accent/40 bg-accentsoft text-accent' : 'border-line bg-surface2 text-muted')}
            aria-label={running ? 'Pause focus timer' : 'Start focus timer'}
          >
            {running ? <Pause size={13} /> : <Play size={13} />} {clock(secs)}
          </button>
        </div>
        <div className="mx-auto max-w-3xl px-4 pb-2.5">
          <div className="flex items-center gap-1.5">
            {ORDER.map((s, idx) => {
              const f = s === 'finish' ? (st.completed ? 1 : 0) : stepProgress(data, day, s as never).fraction;
              return <button key={s} onClick={() => go(s)} aria-label={`Go to ${s}`} className="group h-6 flex-1 min-w-0"><span className={cx('block h-1.5 rounded-full transition-all', idx === i ? 'bg-ink' : f === 1 ? 'bg-accent' : f > 0 ? 'bg-accent/45' : 'bg-surface3')} /></button>;
            })}
          </div>
          <Bar className="mt-1.5" value={st.percent} height={2} />
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-6 pb-32">
        <div key={step} className="animate-rise"><StepContent day={day} step={step} base={base} /></div>
      </main>
      <footer className="pb-safe fixed inset-x-0 bottom-0 border-t border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <Button variant="ghost" disabled={i <= 0} onClick={() => go(ORDER[i - 1])}><ArrowLeft size={15} /> Previous</Button>
          <span className="text-xs text-faint">{i + 1} / {ORDER.length}</span>
          <Button variant="primary" disabled={i >= ORDER.length - 1} onClick={() => go(ORDER[i + 1])}>Next <ArrowRight size={15} /></Button>
        </div>
      </footer>
    </div>
  );
}
