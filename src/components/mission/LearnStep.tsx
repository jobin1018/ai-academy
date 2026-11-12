import { BookOpenText, Clock, PlayCircle, TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import { getResource } from '@/curriculum';
import { FLAG_LABEL } from '@/curriculum/meta';
import type { Day, LearnItem } from '@/curriculum/schema';
import { slotsOf } from '@/domain/progress';
import { Markdown } from '@/components/ui/Markdown';
import { AutoText, Badge, Card, Check_, Disclosure, ExtLink, cx } from '@/components/ui/primitives';
import { useItem, useProgress } from '@/store/context';
import { Hint, StepIntro, StatusDot, dk } from './shared';

/** youtube.com/watch?v=ID[&t=NNNs] -> embed details, or null for any other URL. */
export function parseYouTube(url: string): { id: string; start: number } | null {
  try {
    const u = new URL(url);
    if (!/(^|\.)youtube\.com$/.test(u.hostname) || u.pathname !== '/watch') return null;
    const id = u.searchParams.get('v');
    if (!id) return null;
    const t = u.searchParams.get('t');
    return { id, start: t ? Number.parseInt(t, 10) || 0 : 0 };
  } catch {
    return null;
  }
}
const fmt = (s: number) => `${Math.floor(s / 3600) ? `${Math.floor(s / 3600)}:` : ''}${String(Math.floor((s % 3600) / 60)).padStart(Math.floor(s / 3600) ? 2 : 1, '0')}:${String(s % 60).padStart(2, '0')}`;

function VideoEmbed({ item }: { item: LearnItem }) {
  const vids = item.links.map((l) => ({ l, y: parseYouTube(l.url) })).filter((x) => x.y);
  const [start, setStart] = useState<number | null>(null);
  if (!vids.length) return null;
  const id = vids[0].y!.id;
  const same = vids.filter((v) => v.y!.id === id);
  const jumps = [...new Map(same.map((v) => [v.y!.start, v])).values()].sort((a, b) => a.y!.start - b.y!.start);
  return (
    <div className="space-y-2">
      {start === null ? (
        <button
          onClick={() => setStart(jumps[0].y!.start)}
          className="group flex aspect-video w-full items-center justify-center rounded-xl border border-line bg-gradient-to-br from-surface3 to-bg transition hover:border-accent/50"
          aria-label="Play the video here"
        >
          <span className="flex flex-col items-center gap-2 text-muted transition group-hover:text-accent">
            <PlayCircle size={46} strokeWidth={1.4} />
            <span className="text-sm font-medium">Play here (privacy-enhanced player)</span>
            <span className="text-xs text-faint">If the video refuses to play, use “Open on YouTube”.</span>
          </span>
        </button>
      ) : (
        <div className="aspect-video overflow-hidden rounded-xl border border-line bg-black">
          <iframe
            key={start}
            title={`Video: ${item.title}`}
            src={`https://www.youtube-nocookie.com/embed/${id}?start=${start}&rel=0&autoplay=1`}
            allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            className="h-full w-full"
          />
        </div>
      )}
      {jumps.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-faint">Jump to</span>
          {jumps.map((j) => (
            <button key={j.y!.start} onClick={() => setStart(j.y!.start)} className="rounded-md border border-line bg-surface2 px-2 py-1 font-mono text-[11px] text-muted hover:border-accent/50 hover:text-ink">
              {fmt(j.y!.start)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ResourceRow({ rid }: { rid: string }) {
  const r = getResource(rid);
  if (!r) return null;
  return (
    <div className="rounded-xl border border-line bg-surface2/50 p-3.5">
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
        <span className="font-mono text-xs font-semibold text-iris">{r.id}</span>
        <span className="text-sm font-medium">{r.title}</span>
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-muted">
        <span>{r.creator}</span>
        <Badge tone={r.cost === 'free' ? 'accent' : 'warn'}>{r.cost === 'free' ? 'Free' : 'Paid'}</Badge>
        <span className="inline-flex items-center gap-1"><Clock size={12} /> {r.lengthText}</span>
        {r.flags.map((f) => (
          <Badge key={f} tone={FLAG_LABEL[f].tone === 'danger' ? 'danger' : FLAG_LABEL[f].tone === 'warn' ? 'warn' : 'neutral'} title={FLAG_LABEL[f].hint}>
            <TriangleAlert size={11} /> {FLAG_LABEL[f].label}
          </Badge>
        ))}
      </div>
      {r.costNote && r.cost === 'paid' && <p className="mt-1.5 text-xs text-faint">{r.costNote}</p>}
      <div className="mt-2.5 text-[13px]"><span className="text-faint">Use exactly (Roadmap V2.1): </span><span className="text-muted"><Markdown className="inline [&_p]:inline">{r.useExactly}</Markdown></span></div>
      <div className="mt-3 flex flex-wrap gap-2">
        {r.links.map((l, i) => (
          <ExtLink key={l.url} href={l.url} variant={i === 0 ? 'primary' : 'secondary'} size="md">
            {i === 0 ? `Open resource` : l.label}
          </ExtLink>
        ))}
      </div>
      {r.flags.length > 0 && <p className="mt-2 text-xs text-warn">{r.status}</p>}
    </div>
  );
}

function LearnCard({ day, item }: { day: Day; item: LearnItem }) {
  const [it, set] = useItem(dk(day.day, `learn.${item.index}`));
  const hasVideo = item.links.some((l) => parseYouTube(l.url));
  const needsText = it.done && it.text.trim().length < 10;
  return (
    <Card className={cx('overflow-hidden', it.done && it.text.trim().length >= 10 && 'border-accent/30')}>
      <div className="flex items-start gap-3 border-b border-line bg-surface2/40 px-4 py-3.5 sm:px-5">
        <span className="mt-0.5 text-iris">{hasVideo ? <PlayCircle size={20} /> : <BookOpenText size={20} />}</span>
        <div className="min-w-0 flex-1">
          <h3 className="text-[15.5px] font-semibold leading-snug">{item.title}</h3>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {item.minutes != null && <Badge><Clock size={11} /> ~{item.minutes} min</Badge>}
            {item.isAlternative && <Badge tone="iris">Alternative · either counts</Badge>}
          </div>
        </div>
        <StatusDot done={it.done && it.text.trim().length >= 10} />
      </div>
      <div className="space-y-4 p-4 sm:p-5">
        {item.resourceIds.length > 0 && (
          <div className="space-y-2.5">{item.resourceIds.map((rid) => <ResourceRow key={rid} rid={rid} />)}</div>
        )}
        <VideoEmbed item={item} />
        {item.keyConcepts && (
          <div className="rounded-xl border border-iris/25 bg-irissoft px-4 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-iris">Key concepts to understand</div>
            <p className="mt-1 text-sm leading-relaxed">{item.keyConcepts}</p>
          </div>
        )}
        <Disclosure title="Instructions as written in the playbook" defaultOpen={item.resourceIds.length === 0}>
          <Markdown>{item.bodyMarkdown}</Markdown>
        </Disclosure>

        <div className="rounded-xl border border-line bg-surface2/40 p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-faint">{item.checks.length ? 'Mini knowledge check · answer in writing, without notes' : 'Your notes / exercise result'}</div>
          {item.checks.length > 0 && (
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-ink marker:text-faint">
              {item.checks.map((q) => <li key={q}>{q}</li>)}
            </ol>
          )}
          <AutoText
            className="mt-3"
            value={it.text}
            onCommit={(text) => set({ text })}
            rows={item.checks.length > 3 ? 6 : 4}
            ariaLabel={`Your answers for ${item.title}`}
            placeholder={item.checks.length ? 'Answer each question in your own words before checking the source…' : 'Write what you did or learned…'}
          />
          {needsText && <p className="mt-2 text-xs text-warn">Add your written answers (10+ characters) so this item earns XP.</p>}
        </div>
        <Check_ checked={it.done} onChange={(done) => set({ done })} label="I completed this learning item" />
      </div>
    </Card>
  );
}

export function LearnStep({ day }: { day: Day }) {
  const data = useProgress();
  const mandatory = slotsOf(day).filter((s) => s.step === 'learn').length;
  return (
    <div>
      <StepIntro day={day} data={data} step="learn">
        {mandatory > 0 && day.learn.items.some((i) => i.isAlternative) && <div className="mt-3"><Hint>This day offers two ways to learn the same material (Option A paid, Option B free). Completing either one counts.</Hint></div>}
      </StepIntro>
      {day.learn.intro && <Markdown className="mb-4">{day.learn.intro}</Markdown>}
      <div className="space-y-4">{day.learn.items.map((it) => <LearnCard key={it.index} day={day} item={it} />)}</div>
    </div>
  );
}
