import { Check, Circle, Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { Day } from '@/curriculum/schema';
import { curriculum } from '@/curriculum';
import { BUCKET_LABEL, XP, type XpBucket } from '@/curriculum/meta';
import { dayXp, stepProgress } from '@/domain/progress';
import { STEPS, itemKey, type ProgressData, type StepId } from '@/domain/types';
import { Badge, Bar, cx } from '@/components/ui/primitives';

export const dk = (day: number, local: string) => itemKey(day, local);

/** Which XP bucket each step pays into, and the rule for earning it (from the playbook XP table). */
const STEP_BUCKET: Record<StepId, XpBucket> = { learn: 'learn', design: 'design', build: 'build', test: 'test', challenge: 'wrap', debrief: 'wrap' };

export function StepIntro({ day, data, step, children }: { day: Day; data: ProgressData; step: StepId; children?: ReactNode }) {
  const meta = STEPS.find((s) => s.id === step)!;
  const bucket = STEP_BUCKET[step];
  const earned = dayXp(data, day).buckets[bucket];
  const rule = curriculum.xpModel.find((r) =>
    bucket === 'learn' ? /Learn/.test(r.mission) : bucket === 'design' ? /Design/.test(r.mission) : bucket === 'build' ? /Build/.test(r.mission) : bucket === 'test' ? /Test/.test(r.mission) : /Challenge/.test(r.mission),
  );
  const prog = stepProgress(data, day, step);
  return (
    <div className="mb-5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-faint">Step {meta.n} of 6</span>
        <Badge tone="accent"><Sparkles size={11} /> {earned.earned}/{earned.max} XP · {BUCKET_LABEL[bucket]}{bucket === 'wrap' ? ' (shared)' : ''}</Badge>
        {prog.total > 0 && <Badge>{prog.done}/{prog.total} required done</Badge>}
      </div>
      <h2 className="mt-1.5 text-2xl font-semibold tracking-tight">{meta.title}</h2>
      {rule && <p className="mt-1 text-sm text-muted"><span className="text-faint">XP is earned only when:</span> {rule.earnedOnlyWhen}</p>}
      {children}
    </div>
  );
}

export function StepNav({ day, data, current, base = `/day/${day.day}` }: { day: Day; data: ProgressData; current: string; base?: string }) {
  const tabs: { id: string; label: string; n: string; frac: number | null }[] = [
    { id: '', label: 'Overview', n: '•', frac: null },
    ...STEPS.map((s) => ({ id: s.id, label: s.short, n: String(s.n), frac: stepProgress(data, day, s.id).fraction })),
    { id: 'finish', label: 'Finish', n: '✓', frac: null },
  ];
  return (
    <nav aria-label="Mission steps" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="flex min-w-max gap-1.5 rounded-2xl border border-line bg-surface p-1.5">
        {tabs.map((t) => {
          const active = current === t.id;
          const done = t.frac === 1;
          return (
            <li key={t.id}>
              <Link
                to={t.id ? `${base}/${t.id}` : base}
                aria-current={active ? 'step' : undefined}
                className={cx('flex min-h-[44px] items-center gap-2 rounded-xl px-3.5 text-sm font-medium transition', active ? 'bg-surface3 text-ink shadow-sm' : 'text-muted hover:bg-surface2 hover:text-ink')}
              >
                <span
                  className={cx('grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold', done ? 'bg-accent text-accentink' : active ? 'bg-ink text-bg' : 'bg-surface3 text-faint')}
                  style={!done && t.frac && t.frac > 0 ? { boxShadow: 'inset 0 0 0 2px var(--accent)' } : undefined}
                >
                  {done ? <Check size={12} strokeWidth={3.5} /> : t.n}
                </span>
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function Hint({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'warn' | 'accent' }) {
  return (
    <div className={cx('rounded-xl border px-4 py-3 text-sm leading-relaxed', tone === 'warn' ? 'border-warn/30 bg-warnsoft text-ink' : tone === 'accent' ? 'border-accent/25 bg-accentsoft text-ink' : 'border-line bg-surface2/60 text-muted')}>
      {children}
    </div>
  );
}

export function StatusDot({ done }: { done: boolean }) {
  return done ? (
    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-accent text-accentink"><Check size={12} strokeWidth={3.5} /></span>
  ) : (
    <Circle size={20} className="shrink-0 text-line2" />
  );
}

export const taskLabelInfo = {
  'ai-free-task': { text: 'AI-FREE TASK', tone: 'warn' as const, rule: 'No Claude and no Claude Code for this task. Docs, your own notes and search are allowed.' },
  'claude-code-allowed': { text: 'CLAUDE CODE ALLOWED', tone: 'iris' as const, rule: 'Scaffolding, boilerplate, test generation. Read and be able to explain every line before you commit.' },
  'design-review': { text: 'DESIGN REVIEW', tone: 'accent' as const, rule: 'Write your design first and paste it into the mentoring chat for review before you implement.' },
};

export const xpFor = (b: XpBucket) => XP[b];

/** Open a new claude.ai chat with a prefilled draft. Nothing is sent until you press enter there. */
export const claudeChatUrl = (text: string) => `https://claude.ai/new?q=${encodeURIComponent(text.slice(0, 6000))}`;

export function Bucketbar({ earned, max }: { earned: number; max: number }) {
  return <Bar value={(100 * earned) / max} height={4} />;
}
