import { Clock, Search, TriangleAlert } from 'lucide-react';
import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { DAYS, RESOURCES } from '@/curriculum';
import { CATEGORIES, FLAG_LABEL } from '@/curriculum/meta';
import type { Resource } from '@/curriculum/schema';
import { Markdown } from '@/components/ui/Markdown';
import { Badge, Card, EmptyState, ExtLink, cx } from '@/components/ui/primitives';
import { itemKey, type ProgressData } from '@/domain/types';
import { useProgress } from '@/store/context';

type Status = 'not-started' | 'in-progress' | 'done' | 'unused';

/** A resource is done when every learning item that references it (across all days) is satisfied. */
export function resourceStatus(r: Resource, data: ProgressData): { status: Status; done: number; total: number } {
  let done = 0;
  let total = 0;
  for (const d of DAYS) {
    for (const it of d.learn.items) {
      if (!it.resourceIds.includes(r.id)) continue;
      total++;
      const st = data.items[itemKey(d.day, `learn.${it.index}`)];
      if (st?.done && st.text.trim().length >= 10) done++; // ticked and answered in writing, as for XP
    }
  }
  if (!total) return { status: 'unused', done, total };
  return { status: done === total ? 'done' : done > 0 ? 'in-progress' : 'not-started', done, total };
}

const STATUS_LABEL: Record<Status, { t: string; tone: 'neutral' | 'iris' | 'accent' }> = {
  'not-started': { t: 'Not started', tone: 'neutral' },
  'in-progress': { t: 'In progress', tone: 'iris' },
  done: { t: 'Completed', tone: 'accent' },
  unused: { t: 'Not in a learning step', tone: 'neutral' },
};

function ResourceCard({ r, data }: { r: Resource; data: ProgressData }) {
  const s = resourceStatus(r, data);
  return (
    <Card className={cx('p-4 sm:p-5', r.flags.includes('replaced') && 'opacity-80')}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2"><span className="font-mono text-xs font-semibold text-iris">{r.id}</span><Badge tone={r.cost === 'free' ? 'accent' : 'warn'}>{r.cost === 'free' ? 'Free' : 'Paid'}</Badge><Badge tone={STATUS_LABEL[s.status].tone}>{STATUS_LABEL[s.status].t}{s.total > 1 ? ` ${s.done}/${s.total}` : ''}</Badge></div>
          <h3 className={cx('mt-1.5 text-[16px] font-semibold leading-snug', r.flags.includes('replaced') && 'line-through decoration-line2')}>{r.title}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted"><span>{r.creator}</span><span className="inline-flex items-center gap-1"><Clock size={13} className="text-faint" /> {r.lengthText}</span></div>
        </div>
      </div>
      {r.flags.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {r.flags.map((f) => (
            <div key={f} className={cx('flex items-start gap-2 rounded-lg px-3 py-2 text-[13px]', FLAG_LABEL[f].tone === 'danger' ? 'bg-dangersoft text-ink' : FLAG_LABEL[f].tone === 'warn' ? 'bg-warnsoft text-ink' : 'bg-surface2 text-muted')}>
              <TriangleAlert size={14} className={cx('mt-0.5 shrink-0', FLAG_LABEL[f].tone === 'danger' ? 'text-danger' : 'text-warn')} />
              <span><strong>{FLAG_LABEL[f].label}.</strong> {FLAG_LABEL[f].hint}</span>
            </div>
          ))}
          {r.status && <p className="px-1 text-xs text-faint">Source status: {r.status}</p>}
        </div>
      )}
      <div className="mt-3 text-[13px] text-muted"><span className="text-faint">Use exactly: </span><Markdown className="inline [&_p]:inline">{r.useExactly}</Markdown></div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {r.links.map((l, i) => <ExtLink key={l.url} href={l.url} variant={i === 0 ? 'primary' : 'secondary'} size="sm">{i === 0 && r.links.length === 1 ? 'Open resource' : l.label}</ExtLink>)}
        {r.allDays.length > 0 && <span className="ml-1 flex flex-wrap items-center gap-1.5 text-xs text-faint">Days: {r.allDays.map((d) => <Link key={d} to={`/day/${d}/learn`} className="rounded-md bg-surface3 px-1.5 py-0.5 font-medium text-muted hover:text-ink">{d}</Link>)}</span>}
      </div>
    </Card>
  );
}

export default function LibraryPage() {
  const data = useProgress();
  const [sp, setSp] = useSearchParams();
  const q = sp.get('q') ?? '';
  const cat = sp.get('cat') ?? 'all';
  const cost = sp.get('cost') ?? 'all';
  const attn = sp.get('attn') === '1';
  const set = (k: string, v: string) => {
    const n = new URLSearchParams(sp);
    if (!v || v === 'all') n.delete(k);
    else n.set(k, v);
    setSp(n, { replace: true });
  };

  const byId = useMemo(() => new Map(RESOURCES.map((r) => [r.id, r])), []);
  const match = (r: Resource) => {
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    const hay = `${r.id} ${r.title} ${r.creator} ${r.useExactly}`.toLowerCase();
    return terms.every((t) => hay.includes(t)) && (cost === 'all' || r.cost === cost) && (!attn || r.flags.length > 0);
  };
  const groups = CATEGORIES.filter((c) => cat === 'all' || c.id === cat).map((c) => ({ c, items: (c.ids as readonly string[]).map((id) => byId.get(id)!).filter(Boolean).filter(match) }));
  const total = groups.reduce((a, g) => a + g.items.length, 0);

  return (
    <div className="space-y-6">
      <header className="animate-rise">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Resource library</h1>
        <p className="mt-2 max-w-2xl text-muted">Every resource from Roadmap V2.1 (R1–R18), exactly as listed. Nothing else has been added. Anything the sources mark as unverified, dated or replaced is flagged rather than quietly fixed.</p>
      </header>
      <div className="sticky top-[57px] z-20 -mx-4 space-y-3 border-b border-line bg-bg/92 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:top-0 lg:-mx-10 lg:px-10">
        <label className="relative block">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
          <input value={q} onChange={(e) => set('q', e.target.value)} placeholder="Search title, creator, id (R6), chapter…" aria-label="Search resources" className="h-11 w-full rounded-xl border border-line bg-surface2 pl-10 pr-3 text-sm placeholder:text-faint focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/20" />
        </label>
        <div className="flex gap-1.5 overflow-x-auto pb-0.5" role="tablist" aria-label="Categories">
          {[{ id: 'all', name: 'All' }, ...CATEGORIES].map((c) => (
            <button key={c.id} role="tab" aria-selected={cat === c.id} onClick={() => set('cat', c.id)} className={cx('h-9 shrink-0 rounded-full border px-3.5 text-[13px] font-medium transition', cat === c.id ? 'border-accent/50 bg-accentsoft text-accent' : 'border-line bg-surface text-muted hover:text-ink')}>{c.name}</button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[13px]">
          {['all', 'free', 'paid'].map((c) => <button key={c} onClick={() => set('cost', c)} className={cx('h-8 rounded-lg border px-3 capitalize', cost === c ? 'border-line2 bg-surface3 text-ink' : 'border-line text-muted')}>{c}</button>)}
          <label className="ml-2 inline-flex min-h-8 cursor-pointer items-center gap-2 text-muted"><input type="checkbox" checked={attn} onChange={(e) => set('attn', e.target.checked ? '1' : '')} className="h-4 w-4 accent-[var(--accent)]" /> Needs attention only</label>
          <span className="ml-auto text-xs text-faint">{total} resource{total === 1 ? '' : 's'}</span>
        </div>
      </div>
      {groups.map(({ c, items }) => {
        if (cat === 'all' && items.length === 0 && c.ids.length > 0) return null;
        return (
          <section key={c.id} aria-labelledby={`cat-${c.id}`}>
            <h2 id={`cat-${c.id}`} className="mb-3 text-[13px] font-semibold uppercase tracking-[0.12em] text-faint">{c.name}</h2>
            {items.length ? <div className="space-y-3">{items.map((r) => <ResourceCard key={r.id} r={r} data={data} />)}</div> : c.ids.length === 0 ? (
              <EmptyState title="No verified resources in the sources">Roadmap V2.1 lists no external interview-prep resources. This stage uses your own INTERVIEW_PREP.md and the five mock interviews (Days 14, 22, 26, 28, 29).</EmptyState>
            ) : <EmptyState title="No resources match these filters" />}
          </section>
        );
      })}
    </div>
  );
}
