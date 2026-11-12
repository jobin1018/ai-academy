import * as Dialog from '@radix-ui/react-dialog';
import { BookOpen, FileText, Flag, Library, Search as SearchIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BOSS_FIGHTS, DAYS, RESOURCES } from '@/curriculum';
import { cx } from '@/components/ui/primitives';

interface Hit {
  id: string;
  title: string;
  sub: string;
  to: string;
  icon: 'day' | 'res' | 'boss' | 'page';
  hay: string;
}

const PAGES: Hit[] = [
  ['Mission Control', '/'],
  ['Journey map', '/journey'],
  ['Resource library', '/library'],
  ['Learning journal', '/journal'],
  ['Skills & achievements', '/skills'],
  ['Settings, export and curriculum integrity', '/settings'],
  ['Playbook guide, XP rules and task labels', '/guide'],
].map(([title, to]) => ({ id: to, title, sub: 'Page', to, icon: 'page' as const, hay: title.toLowerCase() }));

function buildIndex(): Hit[] {
  const days: Hit[] = DAYS.map((d) => ({
    id: `day-${d.day}`,
    title: `Day ${d.day} · ${d.title}`,
    sub: d.objective.slice(0, 110),
    to: `/day/${d.day}`,
    icon: 'day',
    hay: [d.title, d.objective, d.unlock, ...d.build.tasks.map((t) => t.title), ...d.learn.items.map((i) => i.title), ...d.debrief.questions].join(' ').toLowerCase(),
  }));
  const res: Hit[] = RESOURCES.map((r) => ({ id: r.id, title: `${r.id} · ${r.title}`, sub: `${r.creator} · ${r.cost === 'paid' ? 'Paid' : 'Free'}`, to: `/library?q=${encodeURIComponent(r.id)}`, icon: 'res', hay: `${r.id} ${r.title} ${r.creator}`.toLowerCase() }));
  const boss: Hit[] = BOSS_FIGHTS.map((b) => ({ id: `boss-${b.id}`, title: `Boss Fight ${b.id} · ${b.name}`, sub: b.scenario.slice(0, 100), to: `/boss/${b.id}`, icon: 'boss', hay: `boss fight ${b.name} ${b.scenario}`.toLowerCase() }));
  return [...PAGES, ...days, ...boss, ...res];
}
const INDEX = buildIndex();
const ICON = { day: FileText, res: Library, boss: Flag, page: BookOpen };

export function SearchDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const nav = useNavigate();

  const results = useMemo(() => {
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) return INDEX.filter((h) => h.icon === 'page' || h.id.startsWith('boss')).slice(0, 10);
    return INDEX.map((h) => ({ h, score: terms.every((t) => h.hay.includes(t)) ? (h.title.toLowerCase().includes(terms[0]) ? 2 : 1) : 0 }))
      .filter((x) => x.score)
      .sort((a, b) => b.score - a.score)
      .slice(0, 14)
      .map((x) => x.h);
  }, [q]);

  const go = (h: Hit) => {
    onOpenChange(false);
    setQ('');
    nav(h.to);
  };

  return (
    <Dialog.Root open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) { setQ(''); setSel(0); } }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-[8vh] z-50 w-[min(640px,calc(100vw-24px))] -translate-x-1/2 overflow-hidden rounded-2xl border border-line2 bg-surface shadow-card animate-rise"
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(s + 1, results.length - 1)); }
            if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
            if (e.key === 'Enter' && results[sel]) go(results[sel]);
          }}
        >
          <Dialog.Title className="sr-only">Search the curriculum</Dialog.Title>
          <div className="flex items-center gap-3 border-b border-line px-4">
            <SearchIcon size={18} className="text-faint" />
            <input
              autoFocus
              value={q}
              onChange={(e) => { setQ(e.target.value); setSel(0); }}
              placeholder="Search days, tasks, resources, boss fights…"
              className="h-14 flex-1 bg-transparent text-[15px] text-ink placeholder:text-faint focus:outline-none"
              aria-label="Search"
            />
          </div>
          <ul className="max-h-[56vh] overflow-y-auto p-2" role="listbox">
            {results.length === 0 && <li className="px-4 py-8 text-center text-sm text-muted">Nothing matches “{q}”.</li>}
            {results.map((h, i) => {
              const I = ICON[h.icon];
              return (
                <li key={h.id} role="option" aria-selected={i === sel}>
                  <button onClick={() => go(h)} onMouseEnter={() => setSel(i)} className={cx('flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left', i === sel ? 'bg-surface3' : '')}>
                    <I size={16} className="mt-1 shrink-0 text-faint" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{h.title}</span>
                      <span className="block truncate text-xs text-muted">{h.sub}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
