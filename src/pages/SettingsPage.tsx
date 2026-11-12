import * as Switch from '@radix-ui/react-switch';
import { AlertCircle, CheckCircle2, Download, LogOut, RefreshCw, Trash2, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { DAYS, RESOURCES, curriculum } from '@/curriculum';
import { AMBIGUITIES } from '@/curriculum/meta';
import { Badge, Button, Card, SectionTitle, cx } from '@/components/ui/primitives';
import type { ProgressData, ThemePref } from '@/domain/types';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useApp, useProgress, useStore, useSyncState } from '@/store/context';

function Row({ title, children, desc }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-3.5">
      <div className="min-w-0 max-w-md"><div className="text-sm font-medium">{title}</div>{desc && <div className="text-[13px] text-muted">{desc}</div>}</div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

export default function SettingsPage() {
  const { mode, email, signOut, engine } = useApp();
  const store = useStore();
  const data = useProgress();
  const sync = useSyncState();
  const file = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const exportJson = () => {
    const blob = new Blob([JSON.stringify({ app: 'ai-engineer-quest', version: 1, exportedAt: new Date().toISOString(), progress: data }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `ai-engineer-quest-progress-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const importJson = async (f: File) => {
    try {
      const parsed = JSON.parse(await f.text()) as { app?: string; progress?: ProgressData };
      if (parsed.app !== 'ai-engineer-quest' || !parsed.progress?.items) throw new Error('This is not an AI Engineer Quest export.');
      const p = parsed.progress;
      store.importSnapshot({ items: p.items, days: p.days ?? {}, journal: p.journal ?? {}, unlocks: p.unlocks ?? {}, settings: p.settings ?? data.settings });
      setMsg({ ok: true, text: `Imported ${Object.keys(p.items).length} items. Newer entries on this device were kept.` });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'Import failed.' });
    }
  };

  const hours = DAYS.reduce((a, d) => a + d.plannedHours, 0);
  const setTheme = (theme: ThemePref) => store.setSettings({ theme });

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header className="animate-rise"><h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Settings & export</h1></header>

      <section>
        <SectionTitle>Account and sync</SectionTitle>
        <Card className="divide-y divide-line px-5">
          {mode === 'cloud' ? (
            <>
              <Row title={email ?? 'Signed in'} desc="Your progress is stored in your Supabase account and protected by Row Level Security.">
                <Button variant="secondary" onClick={() => void signOut()}><LogOut size={15} /> Sign out</Button>
              </Row>
              <Row title={`Sync status: ${sync.status}`} desc={`${sync.pending} change${sync.pending === 1 ? '' : 's'} waiting to upload${sync.lastSyncedAt ? ` · last synced ${new Date(sync.lastSyncedAt).toLocaleTimeString()}` : ''}${sync.error ? ` · ${sync.error}` : ''}`}>
                <Button variant="secondary" onClick={() => void engine?.sync(true)}><RefreshCw size={15} /> Sync now</Button>
              </Row>
            </>
          ) : (
            <Row
              title="Local-only mode"
              desc={isSupabaseConfigured ? 'You chose to use this device only. Progress is saved in this browser and does not sync.' : 'Supabase is not configured for this build, so progress is saved only in this browser. See the README (Supabase setup) to enable accounts and cross-device sync.'}
            >
              {isSupabaseConfigured && <Button variant="primary" onClick={() => void signOut()}>Sign in to sync</Button>}
            </Row>
          )}
        </Card>
      </section>

      <section>
        <SectionTitle>Appearance and preferences</SectionTitle>
        <Card className="divide-y divide-line px-5">
          <Row title="Theme">
            <div className="flex rounded-lg border border-line p-0.5" role="radiogroup" aria-label="Theme">
              {(['dark', 'light', 'system'] as ThemePref[]).map((t) => (
                <button key={t} role="radio" aria-checked={data.settings.theme === t} onClick={() => setTheme(t)} className={cx('h-9 rounded-md px-3.5 text-sm capitalize', data.settings.theme === t ? 'bg-surface3 text-ink' : 'text-muted')}>{t}</button>
              ))}
            </div>
          </Row>
          <Row title="Show study rhythm" desc="Optional. Shows how many days you studied. Missing days is never penalised; nothing resets.">
            <Switch.Root checked={data.settings.showStreak} onCheckedChange={(v) => store.setSettings({ showStreak: v })} aria-label="Show study rhythm" className="h-7 w-12 rounded-full bg-surface3 transition data-[state=checked]:bg-accent">
              <Switch.Thumb className="block h-5 w-5 translate-x-1 rounded-full bg-ink transition data-[state=checked]:translate-x-6 data-[state=checked]:bg-accentink" />
            </Switch.Root>
          </Row>
        </Card>
      </section>

      <section>
        <SectionTitle>Your data</SectionTitle>
        <Card className="divide-y divide-line px-5">
          <Row title="Export progress" desc="Download everything (checklists, notes, journal, time, achievements) as one JSON file."><Button variant="secondary" onClick={exportJson}><Download size={15} /> Export JSON</Button></Row>
          <Row title="Import progress" desc="Merge an export into this account. Where both have a row, the newer edit wins.">
            <input ref={file} type="file" accept="application/json,.json" className="sr-only" aria-label="Choose export file" onChange={(e) => { const f = e.target.files?.[0]; if (f) void importJson(f); e.target.value = ''; }} />
            <Button variant="secondary" onClick={() => file.current?.click()}><Upload size={15} /> Import JSON</Button>
          </Row>
          <Row title="Clear this device's cache" desc={mode === 'cloud' ? 'Removes the local copy only. Your account data stays safe on the server and reloads on next sync.' : 'Local-only mode: this deletes ALL your progress on this device. Export first.'}>
            {confirmClear ? (
              <><Button variant="danger" onClick={() => { store.clearLocal(); setConfirmClear(false); setMsg({ ok: true, text: 'Local cache cleared.' }); }}>Yes, clear it</Button><Button variant="ghost" onClick={() => setConfirmClear(false)}>Cancel</Button></>
            ) : <Button variant="danger" onClick={() => setConfirmClear(true)}><Trash2 size={15} /> Clear cache</Button>}
          </Row>
        </Card>
        {msg && <p role="status" className={cx('mt-3 flex items-center gap-2 text-sm', msg.ok ? 'text-accent' : 'text-danger')}>{msg.ok ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />} {msg.text}</p>}
      </section>

      <section>
        <SectionTitle>Curriculum integrity</SectionTitle>
        <Card className="space-y-4 p-5">
          <ul className="grid gap-2 text-sm sm:grid-cols-2">
            {[
              [DAYS.length === 30, `${DAYS.length} days imported`],
              [hours === 179, `${hours} planned focused hours (canonical: 179)`],
              [RESOURCES.length === 26, `${RESOURCES.length} resources (R1–R18 incl. variants)`],
              [curriculum.bossFights.length === 4, `${curriculum.bossFights.length} boss fights`],
              [curriculum.meta.importReport.errors.length === 0, `${curriculum.meta.importReport.errors.length} import errors`],
              [curriculum.meta.importReport.warnings.length === 0, `${curriculum.meta.importReport.warnings.length} import warnings`],
            ].map(([ok, t], i) => <li key={i} className="flex items-center gap-2">{ok ? <CheckCircle2 size={16} className="text-accent" /> : <AlertCircle size={16} className="text-warn" />}{t as string}</li>)}
          </ul>
          <div className="text-[13px] text-muted">
            Source precedence: {curriculum.meta.precedence.join(' › ')}. Imported from{' '}
            {Object.values(curriculum.meta.sources).map((s) => <code key={s.file} className="mr-1.5 rounded bg-surface3 px-1.5 py-0.5 font-mono text-[11px]">{s.file} · {s.sha256.slice(0, 8)}</code>)}
          </div>
          {curriculum.meta.conflicts.length > 0 && (
            <div>
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-faint">Differences between sources, resolved by precedence</div>
              <ul className="space-y-1 text-[13px] text-muted">
                {curriculum.meta.conflicts.map((c, i) => <li key={i}><Badge className="mr-2">{String(c.resource ?? `Day ${c.day}`)}</Badge>{String(c.field)}: V2.1 lists {JSON.stringify(c.roadmapV21 ?? c.canonical)}; the playbook also uses it on Day {JSON.stringify(c.playbookAlso ?? c.playbook)} → {String(c.resolution)}</li>)}
              </ul>
            </div>
          )}
        </Card>
      </section>

      <section>
        <SectionTitle>Open points flagged, not decided silently</SectionTitle>
        <div className="space-y-2.5">
          {AMBIGUITIES.map((a) => (
            <Card key={a.id} className="p-4">
              <div className="text-sm font-semibold">{a.title}</div>
              <p className="mt-1 text-[13px] text-muted">{a.detail}</p>
              <p className="mt-1.5 text-[13px]"><span className="text-faint">Handled as: </span>{a.resolution}</p>
            </Card>
          ))}
        </div>
      </section>
      <p className="text-center text-xs text-faint"><Link to="/guide" className="hover:text-muted">Playbook guide</Link> · AI Engineer Quest v1.0</p>
    </div>
  );
}
