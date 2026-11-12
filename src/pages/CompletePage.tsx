import { ArrowRight, Award, CheckCircle2, Clock, Compass, Sparkles, Swords, Unlock } from 'lucide-react';
import { Navigate, useParams } from 'react-router-dom';
import { ACHIEVEMENTS, DAYS, getDay, getLevel } from '@/curriculum';
import { Badge, Card, LinkButton, Ring } from '@/components/ui/primitives';
import { dayStatus, skillsOfDay } from '@/domain/progress';
import { useProgress } from '@/store/context';
import { itemKey } from '@/domain/types';

const hm = (min: number) => (min ? `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')} min` : 'not logged');

/** Calm completion summary. No confetti: the point is a clear record of what you can now do. */
export default function CompletePage() {
  const { n } = useParams();
  const data = useProgress();
  const day = getDay(Number(n));
  if (!day) return <Navigate to="/journey" replace />;
  const st = dayStatus(data, day);
  if (!st.completed) return <Navigate to={`/day/${day.day}/finish`} replace />;
  const lv = getLevel(day.level);
  const next = DAYS[day.day];
  const minutes = data.days[day.day]?.minutesSpent ?? 0;
  const skills = skillsOfDay(day.day);
  const response = data.items[itemKey(day.day, 'challenge')]?.text;
  const earned = ACHIEVEMENTS.filter((a) => a.days.includes(day.day) && a.id in data.unlocks);
  const levelDone = DAYS.filter((d) => d.level === day.level).every((d) => data.days[d.day]?.completedAt);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="animate-rise pt-4 text-center">
        <div className="mx-auto mb-5 grid h-20 w-20 place-items-center rounded-full bg-accentsoft text-accent animate-pop"><CheckCircle2 size={44} strokeWidth={1.6} /></div>
        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">Mission accomplished</div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Day {day.day}: {day.title}</h1>
        <p className="mt-2 text-sm text-muted">Level {lv.id} · {lv.name}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="flex items-center gap-4 p-4"><Ring value={st.xp.total} size={60} stroke={6}><Sparkles size={16} className="text-accent" /></Ring><div><div className="text-2xl font-semibold leading-none">{st.xp.total}<span className="text-sm text-faint"> / 100</span></div><div className="mt-1 text-xs text-muted">XP earned</div></div></Card>
        <Card className="p-4"><Clock size={18} className="text-iris" /><div className="mt-2 text-lg font-semibold">{hm(minutes)}</div><div className="text-xs text-muted">Time spent · {day.plannedHours} h planned</div></Card>
        <Card className="p-4"><Compass size={18} className="text-l4" /><div className="mt-2 text-lg font-semibold">{skills.length || '—'} skill area{skills.length === 1 ? '' : 's'}</div><div className="text-xs text-muted">{skills.map((s) => s.name).join(' · ') || 'Practised'}</div></Card>
      </div>

      <Card className="border-accent/30 p-5">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-accent"><Unlock size={13} /> Capability unlocked</div>
        <p className="mt-1.5 text-[17px] leading-snug">{day.unlock}</p>
      </Card>

      <Card className="p-5">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-faint"><Swords size={13} /> Challenge completed</div>
        <p className="mt-1.5 text-sm text-muted">{day.challenge.kind === 'boss' ? `Boss Fight ${day.challenge.bossFightId}` : day.challenge.title}</p>
        {response && <p className="mt-2 line-clamp-4 border-l-2 border-line2 pl-3 text-sm italic text-muted">{response}</p>}
      </Card>

      {earned.length > 0 && (
        <Card className="p-5">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-faint"><Award size={13} /> Achievements earned</div>
          <div className="mt-2 flex flex-wrap gap-2">{earned.map((a) => <Badge key={a.id} tone="accent">{a.name}</Badge>)}</div>
        </Card>
      )}
      {levelDone && <Card className="border-l-4 p-5" style={{ borderLeftColor: `var(--l${lv.id})` }}><div className="text-sm font-semibold" style={{ color: `var(--l${lv.id})` }}>Level {lv.id} complete</div><p className="mt-1 text-sm text-muted">{lv.finishWith}</p></Card>}

      {next ? (
        <Card className="p-5">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-faint">Next mission · {next.dateLabel}</div>
          <h2 className="mt-1 text-xl font-semibold">Day {next.day}: {next.title}</h2>
          <p className="mt-1.5 text-sm text-muted">{next.objective}</p>
          <div className="mt-2 flex flex-wrap gap-2"><Badge>{next.plannedHours} h</Badge><Badge>{next.difficulty}</Badge></div>
          <p className="mt-3 text-sm text-muted"><span className="text-faint">Builds on: </span>{day.nextUnlock}</p>
          <LinkButton to={`/day/${next.day}`} variant="primary" size="lg" className="mt-4">Preview Day {next.day} <ArrowRight size={16} /></LinkButton>
        </Card>
      ) : (
        <Card className="p-5 text-center"><h2 className="text-xl font-semibold">That is all 30 missions.</h2><p className="mt-1 text-sm text-muted">Review your skills, achievements and the 60-day plan you wrote on Day 30.</p><LinkButton to="/skills" variant="primary" className="mt-4">Open skills & achievements</LinkButton></Card>
      )}
      <div className="flex justify-center gap-2"><LinkButton to={`/day/${day.day}`} variant="ghost">Review this day</LinkButton><LinkButton to="/" variant="ghost">Mission Control</LinkButton></div>
    </div>
  );
}
