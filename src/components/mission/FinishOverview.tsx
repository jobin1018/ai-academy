import { ArrowRight, CheckCircle2, Clock, Flag, Lock, RotateCcw, Sparkles, Target, Unlock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { bossForDay, curriculum } from '@/curriculum';
import { BUCKET_LABEL, XP, type XpBucket } from '@/curriculum/meta';
import type { Day } from '@/curriculum/schema';
import { Markdown } from '@/components/ui/Markdown';
import { AutoLine, AutoText, Badge, Bar, Button, Card, Check_, Disclosure, LinkButton, Ring, SectionTitle } from '@/components/ui/primitives';
import { bossProgress, dayStatus, minutesRemaining, slotSatisfied, slotsOf, stepProgress } from '@/domain/progress';
import { STEPS, type StepId } from '@/domain/types';
import { useItem, useProgress, useStore } from '@/store/context';
import { BonusRow } from './DesignBuildSteps';
import { Hint, StatusDot, dk } from './shared';

const hm = (min: number) => (min >= 60 ? `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')} min` : `${min} min`);

/* ------------------------------------ OVERVIEW -------------------------------------- */

function Prework({ day }: { day: Day }) {
  return (
    <Card className="p-4 sm:p-5">
      <div className="mb-1 text-sm font-semibold">{curriculum.prework.title.replace(/:$/, '')}</div>
      <p className="mb-2 text-xs text-faint">Prerequisite set-up from the playbook. Not part of the XP.</p>
      {curriculum.prework.items.map((t, i) => <PreItem key={i} day={day.day} i={i} text={t} />)}
    </Card>
  );
}
function PreItem({ day, i, text }: { day: number; i: number; text: string }) {
  const [it, set] = useItem(dk(day, `prework.${i}`));
  return <Check_ checked={it.done} onChange={(done) => set({ done })} label={<Markdown className="[&_p]:text-ink">{text}</Markdown>} />;
}

export function Overview({ day, base }: { day: Day; base: string }) {
  const data = useProgress();
  const boss = bossForDay(day.day);
  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-2">
        <Card className="p-4 sm:p-5"><div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-faint"><Target size={13} /> Prerequisites</div><p className="mt-1.5 text-sm text-muted">{day.prerequisites || 'None'}</p></Card>
        <Card className="border-accent/30 p-4 sm:p-5"><div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-accent"><Unlock size={13} /> Capability you unlock today</div><p className="mt-1.5 text-sm">{day.unlock}</p></Card>
      </div>
      {day.day === 1 && <Prework day={day} />}
      <div>
        <SectionTitle>The six steps</SectionTitle>
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {STEPS.map((s) => {
            const p = stepProgress(data, day, s.id);
            return (
              <LinkButton key={s.id} to={`${base}/${s.id}`} variant="secondary" size="lg" className="!h-auto !justify-start gap-3 !rounded-2xl !px-4 !py-3.5 text-left">
                <StatusDot done={p.fraction === 1} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{s.n}. {s.title}</span>
                  <span className="block text-xs font-normal text-muted">{p.done}/{p.total} required done</span>
                </span>
                <ArrowRight size={15} className="text-faint" />
              </LinkButton>
            );
          })}
        </div>
      </div>
      <div>
        <SectionTitle aside={<Badge><Clock size={11} /> {day.plannedHours} h planned · {day.learnHours} h learning</Badge>}>Day plan (timetable)</SectionTitle>
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[460px] text-sm">
            <thead><tr className="border-b border-line text-left text-[11px] uppercase tracking-wider text-faint"><th className="px-4 py-2.5 font-semibold">Time</th><th className="px-2 py-2.5 font-semibold">Activity</th><th className="px-4 py-2.5 font-semibold">Output</th></tr></thead>
            <tbody>
              {day.timetable.map((r) => (
                <tr key={r.time} className="border-b border-line/60 last:border-0">
                  <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-muted">{r.time}</td>
                  <td className="px-2 py-2.5">{r.activity}</td>
                  <td className="px-4 py-2.5 text-muted">{r.output}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
      {boss && (
        <Card className="flex flex-wrap items-center gap-4 border-l-4 p-4 sm:p-5" style={{ borderLeftColor: `var(--l${day.level})` }}>
          <Flag size={22} style={{ color: `var(--l${day.level})` }} />
          <div className="min-w-0 flex-1"><div className="text-sm font-semibold">Boss Fight {boss.id} · {boss.name}</div><div className="text-sm text-muted">{boss.scenario}</div></div>
          <LinkButton to={`/boss/${boss.id}`} variant="secondary">Open</LinkButton>
        </Card>
      )}
    </div>
  );
}

/* -------------------------------------- FINISH -------------------------------------- */

const GROUPS: { id: StepId | 'verify'; title: string }[] = [...STEPS.map((s) => ({ id: s.id, title: s.title })), { id: 'verify', title: 'Sign-off' }];

export function FinishStep({ day, base }: { day: Day; base: string }) {
  const data = useProgress();
  const store = useStore();
  const nav = useNavigate();
  const st = dayStatus(data, day);
  const slots = slotsOf(day);
  const [v, setV] = useItem(dk(day.day, 'verify'));
  const minutes = data.days[day.day]?.minutesSpent ?? 0;
  const boss = bossForDay(day.day);
  const bp = boss ? bossProgress(boss, data) : null;
  const gate = day.day === 7 || day.day === 14 || day.day === 21 || day.day === 30;

  const complete = () => {
    store.setDay(day.day, { completedAt: Date.now() });
    nav(`/day/${day.day}/complete`);
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Finish the mission</h2>
        <p className="mt-1 text-sm text-muted">A mission passes only when every mandatory item is done and the verification is attested with evidence. Watching resources alone never completes a day.</p>
      </div>

      <Card className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-5">
          <Ring value={st.percent} size={84} stroke={8}><span className="text-lg font-semibold">{st.percent}%</span></Ring>
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="text-sm"><strong>{st.mandatoryDone}</strong> of {st.mandatoryTotal} mandatory items done · <span className="text-muted">{st.missing.length} remaining</span></div>
            <div className="text-sm text-muted">XP earned: <strong className="text-ink">{st.xp.total}</strong> / 100 · about {hm(minutesRemaining(data, day))} left of {day.plannedHours} h planned</div>
          </div>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-5">
          {(Object.keys(XP) as XpBucket[]).map((b) => (
            <div key={b}>
              <div className="mb-1 flex justify-between text-[11px] text-muted"><span>{BUCKET_LABEL[b].split(' ')[0]}</span><span>{st.xp.buckets[b].earned}/{st.xp.buckets[b].max}</span></div>
              <Bar value={(100 * st.xp.buckets[b].earned) / st.xp.buckets[b].max} height={4} />
            </div>
          ))}
        </div>
      </Card>

      <div>
        <SectionTitle>Today's checklist</SectionTitle>
        <Card className="divide-y divide-line">
          {GROUPS.map((g) => {
            const gs = slots.filter((s) => s.step === g.id && s.mandatory);
            if (!gs.length) return null;
            return (
              <div key={g.id} className="p-4">
                <div className="mb-1.5 flex items-center justify-between"><a href={g.id === 'verify' ? '#signoff' : undefined} className="text-sm font-semibold">{g.title}</a>{g.id !== 'verify' && <LinkButton to={`${base}/${g.id}`} variant="ghost" size="sm">Open</LinkButton>}</div>
                <ul className="space-y-1.5">
                  {gs.map((s) => {
                    const ok = slotSatisfied(data, day.day, s);
                    return (
                      <li key={s.key} className="flex items-start gap-2.5 text-sm">
                        <StatusDot done={ok} />
                        <span className={ok ? 'text-muted' : 'text-ink'}>{s.label}{s.aiFree && <Badge tone="warn" className="ml-2">AI-free</Badge>}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </Card>
      </div>

      <Card id="signoff" className="border-accent/30 p-4 sm:p-5">
        <div className="mb-1 text-sm font-semibold text-accent">Verification sign-off (self-attested, with evidence)</div>
        <p className="text-sm text-muted"><span className="text-faint">The playbook says this mission is passed when: </span>{day.passedWhen}</p>
        <AutoText className="mt-3" label="Evidence: what proves it (test output, numbers, file paths, notes)" rows={3} value={v.text} onCommit={(text) => setV({ text })} placeholder="e.g. 14 tests green, smoke tests pass, cost line reproduced by hand: $0.0042" />
        <div className="mt-3"><AutoLine label="Git commit URL (optional)" type="url" inputMode="url" value={v.url} onCommit={(url) => setV({ url })} placeholder="https://github.com/…/commit/…" /></div>
        <Check_ className="mt-2" checked={v.done} onChange={(done) => setV({ done })} label="I attest this condition is met and the evidence above is true" />
        <div className="mt-3 border-t border-line pt-3">
          <AutoLine label={`Time spent today (minutes). Planned: ${day.plannedHours * 60}`} inputMode="numeric" value={minutes ? String(minutes) : ''} placeholder="0" onCommit={(t) => store.setDay(day.day, { minutesSpent: Math.max(0, Math.min(1440, Number.parseInt(t.replace(/\D/g, ''), 10) || 0)) })} />
          <p className="mt-1 text-xs text-faint">Focus mode adds to this automatically. Edit it any time.</p>
        </div>
      </Card>

      {gate && boss && bp && (
        <Hint tone={bp.status === 'passed' || bp.status === 'partial' ? 'accent' : 'warn'}>
          <Lock size={14} className="mr-1.5 inline -mt-0.5" />
          {day.day === 30 ? 'Day 30 completes only when Boss Fight 4 passes.' : `Day ${day.day} completes only when Boss Fight ${boss.id} passes.`} Current status: <strong>{bp.status.replace('-', ' ')}</strong>.{' '}
          <a className="font-medium text-accent underline" href={`/boss/${boss.id}`} onClick={(e) => { e.preventDefault(); nav(`/boss/${boss.id}`); }}>Open the boss fight</a>
        </Hint>
      )}

      {slots.some((s) => s.key === 'bonus') && <BonusRow day={day} />}

      <div className="grid gap-3 md:grid-cols-2">
        {day.priorities.mustFinish && <Card className="p-4"><div className="text-[11px] font-semibold uppercase tracking-wider text-accent">Must finish</div><p className="mt-1 text-sm text-muted">{day.priorities.mustFinish}</p></Card>}
        {day.priorities.carryForward && <Card className="p-4"><div className="text-[11px] font-semibold uppercase tracking-wider text-faint">May carry forward</div><p className="mt-1 text-sm text-muted">{day.priorities.carryForward}</p></Card>}
      </div>
      <Disclosure title="Playbook sign-off checklist (reference)">
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted">{day.sourceChecklist.map((c, i) => <li key={i}><Markdown className="inline [&_p]:inline">{c}</Markdown></li>)}</ul>
        <p className="mt-2 text-xs text-faint">These are the playbook's own words. Each corresponds to items tracked above.</p>
      </Disclosure>

      <div className="sticky bottom-20 z-10 lg:bottom-4">
        <Card className="flex flex-wrap items-center justify-between gap-3 p-3.5 shadow-lg">
          {st.completed ? (
            <>
              <div className="flex items-center gap-2 text-sm"><CheckCircle2 className="text-accent" size={18} /> Completed {st.completedAt ? new Date(st.completedAt).toLocaleDateString() : ''}</div>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => store.setDay(day.day, { completedAt: null })}><RotateCcw size={15} /> Reopen</Button>
                <LinkButton to={`/day/${day.day}/complete`} variant="primary">View summary <ArrowRight size={15} /></LinkButton>
              </div>
            </>
          ) : (
            <>
              <div className="min-w-0 text-sm text-muted">{st.canComplete ? 'Everything mandatory is done. Ready to close the mission.' : `${st.missing.length} mandatory item${st.missing.length > 1 ? 's' : ''} still open: ${st.missing[0].label}${st.missing.length > 1 ? '…' : ''}`}</div>
              <Button variant="primary" size="lg" disabled={!st.canComplete} onClick={complete}><Sparkles size={16} /> Complete mission</Button>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
