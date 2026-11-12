import { ClipboardCheck, Flag, ShieldAlert, Swords } from 'lucide-react';
import { Link } from 'react-router-dom';
import { curriculum, getBoss } from '@/curriculum';
import { SELF_ASSESSMENT } from '@/curriculum/meta';
import type { Day } from '@/curriculum/schema';
import { Markdown } from '@/components/ui/Markdown';
import { AutoLine, AutoText, Badge, Bar, Card, Check_, CopyButton, Disclosure, LinkButton, cx } from '@/components/ui/primitives';
import { bossProgress } from '@/domain/progress';
import { useItem, useProgress } from '@/store/context';
import { JournalFields } from './JournalFields';
import { Hint, StepIntro, dk } from './shared';

/* -------------------------------------- TEST ---------------------------------------- */

function TestItem({ day, index, md }: { day: Day; index: number; md: string }) {
  const [it, set] = useItem(dk(day.day, `test.${index}`));
  return (
    <Card className={cx('p-4 sm:p-5', it.done && 'border-accent/30')}>
      <div className="flex items-start gap-3">
        <Check_ checked={it.done} onChange={(done) => set({ done })} className="!min-h-0 pt-0.5" label={<span className="sr-only">Verification {index} passed</span>} />
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex items-center gap-2"><span className="font-mono text-xs font-semibold text-iris">Verification {index}</span>{it.done && <Badge tone="accent">Marked passed</Badge>}</div>
          <Markdown>{md}</Markdown>
          <AutoText value={it.text} onCommit={(text) => set({ text })} rows={2} label="Result (paste output, numbers or file paths: optional)" placeholder="e.g. 14 passed in 0.8s" mono />
        </div>
      </div>
    </Card>
  );
}

export function TestStep({ day }: { day: Day }) {
  const data = useProgress();
  const [ev, setEv] = useItem(dk(day.day, 'test.evidence'));
  const evShort = ev.done && ev.text.trim().length < 10 && !ev.url.trim();
  return (
    <div>
      <StepIntro day={day} data={data} step="test">
        <div className="mt-3"><Hint tone="warn"><strong>Nothing is assumed to pass.</strong> Tick a verification only after you have run it and seen it pass. Paste the output or a commit link as evidence.</Hint></div>
      </StepIntro>
      {day.test.intro && <Markdown className="mb-3">{day.test.intro}</Markdown>}
      <div className="space-y-3">{day.test.items.map((md, i) => <TestItem key={i} day={day} index={i + 1} md={md} />)}</div>

      <Card className="mt-4 border-accent/30 p-4 sm:p-5">
        <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-accent"><ClipboardCheck size={16} /> Evidence to record</div>
        {day.test.evidence && <p className="mb-3 text-sm text-muted">{day.test.evidence}</p>}
        <AutoText value={ev.text} onCommit={(text) => setEv({ text })} rows={4} placeholder="Test summary, experiment table, numbers, spend…" ariaLabel="Evidence" />
        <div className="mt-3"><AutoLine label="Git commit or results URL (optional)" type="url" inputMode="url" placeholder="https://github.com/…/commit/…" value={ev.url} onCommit={(url) => setEv({ url })} /></div>
        <Check_ className="mt-2" checked={ev.done} onChange={(done) => setEv({ done })} label="Evidence recorded" />
        {evShort && <p className="text-xs text-warn">Add a note (10+ characters) or a link so the evidence counts.</p>}
      </Card>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Card className="p-4"><div className="text-[11px] font-semibold uppercase tracking-wider text-faint">Expected outcome</div><p className="mt-1 text-sm text-muted">{day.passedWhen}</p></Card>
        {day.priorities.ifStuck && <Card className="p-4"><div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-warn"><ShieldAlert size={12} /> If a check fails</div><p className="mt-1 text-sm text-muted">{day.priorities.ifStuck}</p></Card>}
      </div>
    </div>
  );
}

/* ------------------------------------ CHALLENGE ------------------------------------- */

export function ChallengeStep({ day }: { day: Day }) {
  const data = useProgress();
  const [it, set] = useItem(dk(day.day, 'challenge'));
  const ch = day.challenge;
  const boss = ch.kind === 'boss' && ch.bossFightId ? getBoss(ch.bossFightId) : null;
  const bp = boss ? bossProgress(boss, data) : null;
  return (
    <div>
      <StepIntro day={day} data={data} step="challenge" />
      {boss && bp ? (
        <Card className="overflow-hidden border-l-4 p-5" style={{ borderLeftColor: `var(--l${day.level})` }}>
          <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: `var(--l${day.level})` }}><Swords size={16} /> Boss Fight {boss.id} · {boss.name}</div>
          <p className="mt-2 text-[15px] italic text-muted">{boss.scenario}</p>
          <div className="mt-4 flex items-center gap-3">
            <Bar value={bp.fraction * 100} className="flex-1" />
            <span className="text-xs text-muted">{Object.values(bp.taskDone).filter(Boolean).length}/{boss.tasks.length} tasks</span>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <LinkButton to={`/boss/${boss.id}`} variant="primary" size="lg"><Flag size={16} /> Open the boss fight</LinkButton>
            <Badge tone={bp.status === 'passed' ? 'accent' : bp.status === 'partial' ? 'warn' : 'neutral'}>{bp.status.replace('-', ' ')}</Badge>
          </div>
          <p className="mt-3 text-sm text-muted">Pass when: {boss.passWhen}</p>
          {boss.id === 4 && day.day === 29 && <p className="mt-2 text-xs text-faint">Day 29 needs the Mock 5 task (task 1). The whole fight, plus the final acceptance criteria, closes on Day 30.</p>}
        </Card>
      ) : (
        <>
          {ch.aiFree && (
            <Hint tone="warn">
              <strong>AI-free challenge.</strong> Attempt this without Claude or Claude Code. Your own notes, the docs and search are fine. The point is to find out what you can do unaided.
            </Hint>
          )}
          <Card className="mt-4 p-4 sm:p-5">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-accent"><Swords size={16} /> {ch.title}</div>
            <Markdown>{ch.markdown}</Markdown>
          </Card>
          {day.priorities.ifStuck && (
            <div className="mt-3"><Disclosure title="Hint: the playbook's recovery path for today (IF STUCK)"><p className="text-sm text-muted">{day.priorities.ifStuck}</p><p className="mt-2 text-xs text-faint">Challenges have no solutions or per-challenge hints in the source; this is the day's own recovery advice. No solution is shown.</p></Disclosure></div>
          )}
          <Card className="mt-4 p-4 sm:p-5">
            <AutoText label="Your written response" rows={8} value={it.text} onCommit={(text) => set({ text })} placeholder="Write your answer before looking anything up…" />
            <fieldset className="mt-4">
              <legend className="mb-2 text-xs font-medium text-muted">Self-assessment</legend>
              <div className="flex flex-wrap gap-2">
                {SELF_ASSESSMENT.map((o) => (
                  <label key={o.value} className={cx('flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl border px-3.5 text-sm transition', it.rating === o.value ? 'border-accent bg-accentsoft text-ink' : 'border-line bg-surface2 text-muted hover:border-line2')}>
                    <input type="radio" name={`rate-${day.day}`} className="sr-only" checked={it.rating === o.value} onChange={() => set({ rating: o.value })} />
                    {o.label}
                  </label>
                ))}
              </div>
            </fieldset>
            <Check_ className="mt-3" checked={it.done} onChange={(done) => set({ done })} label="Challenge completed" />
            {it.done && it.text.trim().length < 20 && <p className="text-xs text-warn">Write at least 20 characters of response so it counts.</p>}
          </Card>
        </>
      )}
    </div>
  );
}

/* ------------------------------------- DEBRIEF -------------------------------------- */

function QuestionCard({ day, index, q }: { day: Day; index: number; q: string }) {
  const [it, set] = useItem(dk(day.day, `debrief.q${index}`));
  return (
    <Card className={cx('p-4 sm:p-5', it.done && it.text.trim().length >= 20 && 'border-accent/30')}>
      <div className="flex items-center gap-2"><span className="font-mono text-xs font-semibold text-iris">Interview question {index}</span>{day.debrief.aiFree && <Badge tone="warn">Written, no Claude</Badge>}</div>
      <p className="mt-1.5 text-[15px] font-medium leading-snug">{q}</p>
      <AutoText className="mt-3" rows={4} ariaLabel={`Answer to interview question ${index}`} value={it.text} onCommit={(text) => set({ text })} placeholder="Answer as you would in an interview, without notes…" />
      <Check_ className="mt-1" checked={it.done} onChange={(done) => set({ done })} label="I answered this without notes" />
    </Card>
  );
}

export function DebriefStep({ day }: { day: Day }) {
  const data = useProgress();
  const d = day.debrief;
  const [log, setLog] = useItem(dk(day.day, 'debrief.log'));
  const [rec, setRec] = useItem(dk(day.day, 'debrief.recall'));
  const [exp, setExp] = useItem(dk(day.day, 'debrief.explain'));
  const template = curriculum.meta.learningLogTemplate.replace('Day N — <mission title> — <date>', `Day ${day.day} — ${day.title} — ${day.dateLabel}`);
  return (
    <div>
      <StepIntro day={day} data={data} step="debrief" />
      <div className="space-y-3">{d.questions.map((q, i) => <QuestionCard key={i} day={day} index={i + 1} q={q} />)}</div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {d.recall && (
          <Card className="p-4 sm:p-5">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-faint">Active recall exercise</div>
            <p className="mt-1.5 text-sm">{d.recall}</p>
            <Check_ checked={rec.done} onChange={(done) => setRec({ done })} label="I did the recall exercise" />
          </Card>
        )}
        {d.explain && (
          <Card className="p-4 sm:p-5">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-faint">Understand without notes</div>
            <p className="mt-1.5 text-sm">{d.explain}</p>
            <Check_ checked={exp.done} onChange={(done) => setExp({ done })} label="I can explain this out loud" />
          </Card>
        )}
      </div>

      <Card className="mt-4 p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm font-semibold">Learning-log entry <span className="font-normal text-faint">(your LEARNING_LOG.md)</span></div>
          <div className="flex gap-2">
            <button className="h-8 rounded-md border border-line bg-surface2 px-2.5 text-xs font-medium text-muted hover:text-ink" onClick={() => setLog({ text: log.text ? log.text : template })}>Insert template</button>
            <CopyButton text={log.text || template} label="Copy" />
          </div>
        </div>
        {d.log && <p className="mb-3 text-sm text-muted"><span className="text-faint">Record: </span>{d.log}</p>}
        <AutoText rows={12} mono value={log.text} onCommit={(text) => setLog({ text })} ariaLabel="Learning log entry" placeholder="Click “Insert template”, then fill in I wrote / Claude Code wrote / I can explain / still unclear…" />
        <Check_ className="mt-2" checked={log.done} onChange={(done) => setLog({ done })} label="Log entry written (and committed to the repo)" />
        {log.done && log.text.trim().length < 20 && <p className="text-xs text-warn">Write at least 20 characters so it counts.</p>}
      </Card>

      <Card className="mt-4 p-4 sm:p-5">
        <div className="mb-3 text-sm font-semibold">Reflections <span className="font-normal text-faint">(saved to your journal for Day {day.day})</span></div>
        <JournalFields day={day.day} only={['learned', 'questionsToRevisit']} />
        {d.revisit && <p className="mt-3 text-sm text-muted"><span className="text-faint">The playbook says to revisit: </span>{d.revisit}</p>}
        <Link to={`/journal?day=${day.day}`} className="mt-3 inline-block text-sm font-medium text-accent hover:underline">Open the full journal entry</Link>
      </Card>
    </div>
  );
}
