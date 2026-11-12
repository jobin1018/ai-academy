import { AlertTriangle, BookOpen, Bot, Clock, FileCode2, GitBranch, Lightbulb, PencilRuler, Terminal } from 'lucide-react';
import { useState } from 'react';
import { curriculum } from '@/curriculum';
import type { BuildTask, Day } from '@/curriculum/schema';
import { Markdown } from '@/components/ui/Markdown';
import { AutoText, Badge, Card, Check_, CodeBlock, CopyButton, Disclosure, ExtLink, cx } from '@/components/ui/primitives';
import { slotsOf } from '@/domain/progress';
import { useItem, useProgress } from '@/store/context';
import { Hint, StatusDot, StepIntro, claudeChatUrl, dk, taskLabelInfo } from './shared';

const BLOCK = {
  'what-and-why': { icon: Lightbulb, title: 'The engineering problem: what we build and why', tone: 'text-warn' },
  concepts: { icon: BookOpen, title: 'Concepts to hold in your head', tone: 'text-iris' },
  decisions: { icon: GitBranch, title: 'Architecture decisions', tone: 'text-l2' },
  pitfalls: { icon: AlertTriangle, title: 'Common pitfalls', tone: 'text-danger' },
  exercise: { icon: PencilRuler, title: 'Design exercise', tone: 'text-accent' },
  other: { icon: BookOpen, title: 'Notes', tone: 'text-muted' },
} as const;

export function DesignStep({ day }: { day: Day }) {
  const data = useProgress();
  const [it, set] = useItem(dk(day.day, 'design'));
  const [rev, setRev] = useItem(dk(day.day, 'design.review'));
  const short = it.done && it.text.trim().length < 20;
  const draft = `Design review request. Day ${day.day}: ${day.title}\n\nMy design (written without AI help):\n\n${it.text}\n\nPlease review it critically: what did I miss, and which decisions are weakest?`;
  return (
    <div>
      <StepIntro day={day} data={data} step="design" />
      <div className="space-y-3">
        {day.design.blocks.filter((b) => b.kind !== 'exercise').map((b, i) => {
          const m = BLOCK[b.kind];
          return (
            <Card key={i} className="p-4 sm:p-5">
              <div className={cx('mb-2 flex items-center gap-2 text-sm font-semibold', m.tone)}><m.icon size={16} /> {m.title}</div>
              <Markdown>{b.markdown.replace(/^\*\*[^*]+\*\*\s*/, '')}</Markdown>
            </Card>
          );
        })}
        {day.design.blocks.filter((b) => b.kind === 'exercise').map((b, i) => (
          <Card key={`ex${i}`} className="border-accent/30 bg-gradient-to-b from-accentsoft to-transparent p-4 sm:p-5">
            <div className="mb-2 flex flex-wrap items-center gap-2 text-sm font-semibold text-accent">
              <PencilRuler size={16} /> {b.label || 'Design exercise'}
              {day.design.aiFree && <Badge tone="warn">AI-free</Badge>}
            </div>
            <Markdown>{b.markdown.replace(/^\*\*[^*]+\*\*\s*/, '')}</Markdown>
          </Card>
        ))}
      </div>

      <Card className="mt-4 p-4 sm:p-5">
        <AutoText
          label="Your design and reasoning"
          value={it.text}
          onCommit={(text) => set({ text })}
          rows={9}
          placeholder="Write the exercise answer here: interfaces, tables, rules, trade-offs, the decision and why…"
        />
        {short && <p className="mt-2 text-xs text-warn">Write at least 20 characters so this counts toward XP.</p>}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <Check_ checked={it.done} onChange={(done) => set({ done })} label="My design is written down" />
          {day.design.designReview && (
            <div className="flex flex-wrap items-center gap-2">
              <CopyButton text={draft} label="Copy review request" />
              <ExtLink href={claudeChatUrl(draft)} size="sm">Open claude.ai with this draft</ExtLink>
            </div>
          )}
        </div>
        {day.design.designReview && (
          <div className="mt-3 border-t border-line pt-3">
            <Check_ checked={rev.done} onChange={(done) => setRev({ done })} label="DESIGN REVIEW done: I pasted it into the mentoring chat and addressed the feedback" />
            <p className="mt-1 text-xs text-faint">“Open claude.ai” only opens a new chat with your text prefilled. Nothing is sent until you press enter there; this app does not talk to Claude.</p>
          </div>
        )}
      </Card>
    </div>
  );
}

/* ------------------------------------- BUILD -------------------------------------- */

function modelRules(): string[] {
  const md = curriculum.meta.guide[0]?.markdown ?? '';
  const m = md.match(/Non-negotiable model rules[^\n]*\n((?:- .*\n?)+)/);
  return m ? m[1].split('\n').filter((l) => l.startsWith('- ')).map((l) => l.slice(2)) : [];
}

function TaskCard({ day, task, defaultOpen }: { day: Day; task: BuildTask; defaultOpen: boolean }) {
  const [it, set] = useItem(dk(day.day, `build.${task.id}`));
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card className={cx('overflow-hidden', it.done && 'border-accent/30')}>
      <div className="flex items-start gap-3 px-4 py-3.5 sm:px-5">
        <div className="pt-0.5"><Check_ checked={it.done} onChange={(done) => set({ done })} className="!min-h-0" label={<span className="sr-only">Mark task {task.id} done</span>} /></div>
        <button className="min-w-0 flex-1 text-left" onClick={() => setOpen(!open)} aria-expanded={open}>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-mono text-xs font-semibold text-iris">Task {task.id}</span>
            {task.optional && <Badge>Optional · no XP</Badge>}
            {task.labels.map((l) => <Badge key={l} tone={taskLabelInfo[l].tone}>{taskLabelInfo[l].text}</Badge>)}
          </div>
          <h3 className={cx('mt-1 text-[15.5px] font-semibold leading-snug', it.done && 'text-muted line-through decoration-line2')}>{task.title}</h3>
          {task.files.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {task.files.map((f) => <span key={f} className="inline-flex items-center gap-1 rounded-md bg-surface3 px-1.5 py-0.5 font-mono text-[11px] text-muted"><FileCode2 size={11} /> {f}</span>)}
            </div>
          )}
        </button>
      </div>
      {open && (
        <div className="space-y-4 border-t border-line px-4 py-4 sm:px-5">
          {task.labels.map((l) => (
            <Hint key={l} tone={l === 'ai-free-task' ? 'warn' : l === 'design-review' ? 'accent' : 'neutral'}>
              <strong>{taskLabelInfo[l].text}.</strong> {taskLabelInfo[l].rule}
            </Hint>
          ))}
          <Markdown>{task.description}</Markdown>
          {task.commands.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-faint"><Terminal size={12} /> Terminal commands</div>
              {task.commands.map((c) => <CodeBlock key={c} code={c} />)}
            </div>
          )}
          {task.prompts.map((p, i) => (
            <CodeBlock key={i} code={p} title="Prompt for Claude Code (paste into VS Code)" copyLabel="Copy prompt" extra={<span className="hidden items-center gap-1 text-[11px] text-faint sm:flex"><Bot size={12} /> Claude Code</span>} />
          ))}
          {task.acceptance.length > 0 && (
            <div className="rounded-xl border border-accent/25 bg-accentsoft px-4 py-3">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-accent">Acceptance criteria · expected behaviour</div>
              <ul className="mt-1.5 space-y-1.5 text-sm">
                {task.acceptance.map((a, i) => <li key={i} className="flex gap-2"><span className="text-accent">✓</span><span><span className="text-faint">{a.kind}: </span><Markdown className="inline [&_p]:inline [&_p]:text-ink">{a.text}</Markdown></span></li>)}
              </ul>
            </div>
          )}
          <AutoText label="Task notes (decisions, blockers, commit message…)" value={it.text} onCommit={(text) => set({ text })} rows={3} placeholder="Optional" />
        </div>
      )}
    </Card>
  );
}

export function BuildStep({ day }: { day: Day }) {
  const data = useProgress();
  const rules = modelRules();
  const blocks = day.timetable.filter((r) => /build|experiment|ai-free|mock|generate|held-out|matrix|deploy|label|run /i.test(r.activity));
  const firstOpen = day.build.tasks.findIndex((t) => !(data.items[dk(day.day, `build.${t.id}`)]?.done));
  const bonus = slotsOf(day).find((s) => s.key === 'bonus');
  return (
    <div>
      <StepIntro day={day} data={data} step="build">
        <p className="mt-2 text-sm text-muted">Work in VS Code with Claude Code where the label allows it. Tick a task only when its expected output exists.</p>
      </StepIntro>
      {day.build.intro && <Markdown className="mb-4">{day.build.intro}</Markdown>}
      {blocks.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-muted">
          <Clock size={13} className="text-faint" /> Time blocks:
          {blocks.map((b) => <Badge key={b.time}>{b.time} · {b.activity}</Badge>)}
          <span className="text-faint">(the playbook gives no per-task estimates)</span>
        </div>
      )}
      {rules.length > 0 && (
        <div className="mb-4">
          <Disclosure title="Non-negotiable model rules (Roadmap V2.1)" tone="warn">
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted">{rules.map((r) => <li key={r}><Markdown className="inline [&_p]:inline">{r}</Markdown></li>)}</ul>
          </Disclosure>
        </div>
      )}
      <div className="space-y-3">
        {day.build.tasks.map((t, i) => <TaskCard key={t.id} day={day} task={t} defaultOpen={i === Math.max(0, firstOpen)} />)}
      </div>
      {bonus && <BonusRow day={day} />}
    </div>
  );
}

export function BonusRow({ day }: { day: Day }) {
  const [it, set] = useItem(dk(day.day, 'bonus'));
  return (
    <Card className="mt-4 p-4">
      <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-faint">If time remains · optional, no XP</div>
      <div className="text-sm text-muted">{day.priorities.ifTimeRemains}</div>
      <Check_ checked={it.done} onChange={(done) => set({ done })} label="Done" />
    </Card>
  );
}

export { StatusDot };
