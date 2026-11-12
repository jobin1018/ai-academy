import { Ban, CheckCircle2, Circle, FileText, Flag, ListChecks, Scissors, ShieldAlert, Swords } from 'lucide-react';
import { Navigate, useParams } from 'react-router-dom';
import { curriculum, getBoss, getLevel } from '@/curriculum';
import { Markdown } from '@/components/ui/Markdown';
import { AutoLine, AutoText, Badge, Bar, Card, Check_, Disclosure, LinkButton, SectionTitle, cx } from '@/components/ui/primitives';
import { Hint } from '@/components/mission/shared';
import { bossProgress } from '@/domain/progress';
import { bossKey } from '@/domain/types';
import { useItem, useProgress } from '@/store/context';

function TaskRow({ bossId, id, text, cuttable }: { bossId: number; id: number; text: string; cuttable: boolean }) {
  const [t, setT] = useItem(bossKey(bossId, `t${id}`));
  const [cut, setCut] = useItem(bossKey(bossId, `cut${id}`));
  const cutOn = cut.done && cut.text.trim().length >= 10;
  return (
    <div className={cx('rounded-xl border p-3.5', t.done ? 'border-accent/30 bg-accentsoft/40' : cutOn ? 'border-warn/30 bg-warnsoft' : 'border-line bg-surface2/40')}>
      <div className="flex items-start gap-3">
        <Check_ checked={t.done} onChange={(done) => setT({ done })} className="!min-h-0 pt-0.5" label={<span className="sr-only">Task {id} done</span>} />
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-faint">Required task {id}</div>
          <Markdown className="[&_p]:text-ink">{text}</Markdown>
          <AutoLine label="Evidence for this task (file path, commit, number): optional" value={t.text} onCommit={(text) => setT({ text })} placeholder="e.g. docs/EVALUATION.md#week-1, commit abc123" />
          {cuttable && (
            <div className="mt-3 rounded-lg border border-line bg-surface p-3">
              <Check_ checked={cut.done} onChange={(done) => setCut({ done })} label={<span className="flex items-center gap-1.5"><Scissors size={14} className="text-warn" /> Formally cut under the cut list (result: Partial)</span>} />
              {cut.done && <AutoText label="Why it was cut and where it is carried to" rows={2} value={cut.text} onCommit={(text) => setCut({ text })} placeholder="Required: record the cut (10+ characters)" />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Acceptance({ bossId }: { bossId: number }) {
  return (
    <div className="space-y-4">
      {curriculum.acceptanceChecklist.map((g, gi) => (
        <div key={gi}>
          <div className="mb-1 text-sm font-semibold">{g.title}</div>
          {g.items.map((it, ii) => <AcceptRow key={ii} k={bossKey(bossId, `acc.${gi}.${ii}`)} text={it} />)}
        </div>
      ))}
    </div>
  );
}
function AcceptRow({ k, text }: { k: string; text: string }) {
  const [it, set] = useItem(k);
  return (
    <div className="py-0.5">
      <Check_ checked={it.done} onChange={(done) => set({ done })} label={<Markdown className="[&_p]:text-ink">{text}</Markdown>} />
      {!it.done && <div className="ml-9"><AutoLine label="Not done yet? Write a dated plan (counts as scheduled)" value={it.text} onCommit={(text) => set({ text })} placeholder="e.g. Scheduled Mon 14 Dec, 2 h" /></div>}
    </div>
  );
}
function PortfolioRow({ k, text }: { k: string; text: string }) {
  const [it, set] = useItem(k);
  return <Check_ checked={it.done} onChange={(done) => set({ done })} label={<Markdown className="[&_p]:text-ink">{text}</Markdown>} />;
}

export default function BossPage() {
  const { id } = useParams();
  const boss = getBoss(Number(id));
  const data = useProgress();
  const [ev, setEv] = useItem(bossKey(Number(id), 'evidence'));
  if (!boss) return <Navigate to="/journey" replace />;
  const p = bossProgress(boss, data);
  const lv = getLevel(boss.id);
  const done = Object.values(p.taskDone).filter(Boolean).length;
  const verdict = p.status === 'passed' ? { tone: 'accent' as const, text: 'Passed' } : p.status === 'partial' ? { tone: 'warn' as const, text: 'Partial: a task was formally cut' } : p.status === 'in-progress' ? { tone: 'neutral' as const, text: 'In progress' } : { tone: 'neutral' as const, text: 'Not started' };
  const last = boss.days[boss.days.length - 1];

  const criteria = [
    ...boss.tasks.map((t) => ({ label: `Task ${t.id}`, ok: p.taskDone[t.id] || p.taskCut[t.id], cut: !p.taskDone[t.id] && p.taskCut[t.id] })),
    { label: 'Evidence recorded', ok: p.evidenceOk, cut: false },
    ...(boss.id === 4 ? [{ label: `Acceptance criteria (${p.acceptanceDone}/${p.acceptanceTotal})`, ok: p.acceptanceOk, cut: false }] : []),
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header className="animate-rise">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wider" style={{ color: `var(--l${lv.id})` }}><Flag size={14} /> Boss Fight {boss.id} · {boss.whenText} · Level {lv.id}</div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{boss.name}</h1>
        <p className="mt-3 border-l-4 pl-4 text-lg italic text-muted" style={{ borderColor: `var(--l${lv.id})` }}>{boss.scenario}</p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Badge tone={verdict.tone}>{verdict.text}</Badge>
          <Bar value={(100 * done) / boss.tasks.length} className="max-w-xs flex-1" />
          <span className="text-xs text-muted">{done}/{boss.tasks.length} tasks</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">{boss.days.map((d) => <LinkButton key={d} to={`/day/${d}`} variant="ghost" size="sm">Day {d}</LinkButton>)}</div>
      </header>

      {boss.id === 4 && <Hint>This fight spans Days 29–30: Day 29 needs the Mock 5 task; Day {last} completes only when every task, the evidence and the final acceptance criteria are satisfied (or have a dated plan).</Hint>}

      <section>
        <SectionTitle>Required tasks</SectionTitle>
        <div className="space-y-2.5">{boss.tasks.map((t) => <TaskRow key={t.id} bossId={boss.id} {...t} />)}</div>
      </section>

      {boss.restrictions && (
        <Card className="border-warn/30 p-4 sm:p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-warn"><Ban size={15} /> Restrictions</div>
          <p className="mt-1.5 text-sm">{boss.restrictions}</p>
        </Card>
      )}

      <Card className="p-4 sm:p-5">
        <div className="flex items-center gap-2 text-sm font-semibold"><FileText size={15} className="text-iris" /> Evidence requirements</div>
        {boss.evidence ? <p className="mt-1.5 text-sm text-muted">{boss.evidence}</p> : <p className="mt-1.5 text-sm text-muted">The playbook lists no separate evidence line for this fight; record where each task is proved.</p>}
        <AutoText className="mt-3" label="Evidence summary (what you committed and where)" rows={4} value={ev.text} onCommit={(text) => setEv({ text })} placeholder="List files, commits, tables, mock critiques…" />
        <div className="mt-3"><AutoLine label="Main commit or document URL (optional)" type="url" inputMode="url" value={ev.url} onCommit={(url) => setEv({ url })} /></div>
      </Card>

      {boss.id === 4 && (
        <>
          <Card className="p-4 sm:p-5"><div className="mb-3 flex items-center gap-2 text-sm font-semibold"><ListChecks size={15} className="text-accent" /> Final Day 30 acceptance criteria</div><Acceptance bossId={4} /></Card>
          <Card className="p-4 sm:p-5">
            <div className="mb-3 text-sm font-semibold">Portfolio and job-readiness checklist <span className="font-normal text-faint">(reference, does not gate the fight)</span></div>
            {curriculum.portfolioChecklist.map((g, gi) => <div key={gi} className="mb-3 last:mb-0"><div className="mb-0.5 text-[11px] font-semibold uppercase tracking-wider text-faint">{g.title}</div>{g.items.map((t, ii) => <PortfolioRow key={ii} k={bossKey(4, `port.${gi}.${ii}`)} text={t} />)}</div>)}
          </Card>
        </>
      )}

      <Card className="p-4 sm:p-5" aria-live="polite">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold"><Swords size={15} style={{ color: `var(--l${lv.id})` }} /> Pass / fail checklist</div>
        <ul className="grid gap-1.5 sm:grid-cols-2">
          {criteria.map((c) => (
            <li key={c.label} className="flex items-center gap-2 text-sm">
              {c.ok ? <CheckCircle2 size={17} className={c.cut ? 'text-warn' : 'text-accent'} /> : <Circle size={17} className="text-line2" />}
              <span className={c.ok ? 'text-ink' : 'text-muted'}>{c.label}{c.cut ? ' (cut)' : ''}</span>
            </li>
          ))}
        </ul>
        <div className={cx('mt-4 rounded-xl border px-4 py-3 text-sm', p.status === 'passed' ? 'border-accent/30 bg-accentsoft' : p.status === 'partial' ? 'border-warn/30 bg-warnsoft' : 'border-line bg-surface2/50')}>
          <strong>Pass when:</strong> {boss.passWhen}
        </div>
        <p className="mt-3 text-xs text-faint">XP and ticked boxes never override a failed boss fight. A fight passes only when its mandatory technical criteria are met.</p>
      </Card>

      <Disclosure title={<span className="flex items-center gap-2"><ShieldAlert size={15} className="text-danger" /> If you fail</span>} tone="warn">
        <p className="text-sm text-muted">{boss.ifYouFail}</p>
      </Disclosure>
    </div>
  );
}
