import {
  defaultSettings,
  emptyDay,
  emptyItem,
  emptyJournal,
  emptyProgress,
  type DayState,
  type ItemState,
  type JournalEntry,
  type ProgressData,
  type Settings,
} from '@/domain/types';

/**
 * Local-first progress store. All reads and writes hit this store synchronously, so the UI is
 * instant; every change is persisted to local storage and marked dirty so the sync engine can push
 * it to Supabase. Local storage is only a cache + offline buffer: cross-device sync comes from the
 * remote store, never from this file.
 */

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface RemoteSnapshot {
  items: ({ key: string } & ItemState)[];
  days: ({ day: number } & DayState)[];
  journal: ({ day: number } & JournalEntry)[];
  settings: Settings | null;
  unlocks: { id: string; at: number }[];
}

export interface PushBatch {
  items: ({ key: string } & ItemState)[];
  days: ({ day: number } & DayState)[];
  journal: ({ day: number } & JournalEntry)[];
  settings: Settings | null;
  unlocks: { id: string; at: number }[];
}

type Listener = () => void;
const VERSION = 1;

export class ProgressStore {
  private data: ProgressData = emptyProgress();
  private dirty = new Set<string>();
  private listeners = new Set<Listener>();
  private readonly storageKey: string;

  constructor(
    readonly namespace: string,
    private readonly storage: KeyValueStorage | null = null,
    private readonly clock: () => number = Date.now,
  ) {
    this.storageKey = `aeq:v${VERSION}:${namespace}`;
    this.load();
  }

  /* ---------- subscription ---------- */
  subscribe = (l: Listener) => {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  };
  getSnapshot = (): ProgressData => this.data;
  private emit() {
    this.persist();
    this.listeners.forEach((l) => l());
  }

  /* ---------- reads ---------- */
  hasDirty() {
    return this.dirty.size > 0;
  }
  dirtyCount() {
    return this.dirty.size;
  }

  /* ---------- writes (each stamps updatedAt and marks the row dirty) ---------- */
  setItem(key: string, patch: Partial<Omit<ItemState, 'updatedAt'>>) {
    const prev = this.data.items[key] ?? emptyItem();
    const next: ItemState = { ...prev, ...patch, updatedAt: this.clock() };
    if (prev.done === next.done && prev.text === next.text && prev.url === next.url && prev.rating === next.rating) return;
    this.data = { ...this.data, items: { ...this.data.items, [key]: next } };
    this.dirty.add(`item:${key}`);
    this.emit();
  }

  setDay(day: number, patch: Partial<Omit<DayState, 'updatedAt'>>) {
    const prev = this.data.days[day] ?? emptyDay();
    const next: DayState = { ...prev, ...patch, updatedAt: this.clock() };
    this.data = { ...this.data, days: { ...this.data.days, [day]: next } };
    this.dirty.add(`day:${day}`);
    this.emit();
  }

  setJournal(day: number, patch: Partial<Omit<JournalEntry, 'updatedAt'>>) {
    const prev = this.data.journal[day] ?? emptyJournal();
    const next: JournalEntry = { ...prev, ...patch, updatedAt: this.clock() };
    this.data = { ...this.data, journal: { ...this.data.journal, [day]: next } };
    this.dirty.add(`journal:${day}`);
    this.emit();
  }

  setSettings(patch: Partial<Omit<Settings, 'updatedAt'>>) {
    this.data = { ...this.data, settings: { ...this.data.settings, ...patch, updatedAt: this.clock() } };
    this.dirty.add('settings');
    this.emit();
  }

  recordUnlocks(ids: string[]) {
    const fresh = ids.filter((id) => !(id in this.data.unlocks));
    if (!fresh.length) return;
    const at = this.clock();
    const unlocks = { ...this.data.unlocks };
    for (const id of fresh) {
      unlocks[id] = at;
      this.dirty.add(`unlock:${id}`);
    }
    this.data = { ...this.data, unlocks };
    this.emit();
  }

  /* ---------- sync support ---------- */

  /** Rows waiting to be pushed. */
  collectDirty(): PushBatch {
    const batch: PushBatch = { items: [], days: [], journal: [], settings: null, unlocks: [] };
    for (const ref of this.dirty) {
      const [kind, ...rest] = ref.split(':');
      const id = rest.join(':');
      if (kind === 'item' && this.data.items[id]) batch.items.push({ key: id, ...this.data.items[id] });
      else if (kind === 'day' && this.data.days[Number(id)]) batch.days.push({ day: Number(id), ...this.data.days[Number(id)] });
      else if (kind === 'journal' && this.data.journal[Number(id)]) batch.journal.push({ day: Number(id), ...this.data.journal[Number(id)] });
      else if (kind === 'settings') batch.settings = this.data.settings;
      else if (kind === 'unlock' && id in this.data.unlocks) batch.unlocks.push({ id, at: this.data.unlocks[id] });
    }
    return batch;
  }

  /** Clear dirty marks for rows that were pushed, unless they changed again while the push ran. */
  markPushed(batch: PushBatch) {
    const same = (a: number, b: number) => a === b;
    batch.items.forEach((r) => same(this.data.items[r.key]?.updatedAt, r.updatedAt) && this.dirty.delete(`item:${r.key}`));
    batch.days.forEach((r) => same(this.data.days[r.day]?.updatedAt, r.updatedAt) && this.dirty.delete(`day:${r.day}`));
    batch.journal.forEach((r) => same(this.data.journal[r.day]?.updatedAt, r.updatedAt) && this.dirty.delete(`journal:${r.day}`));
    if (batch.settings && same(this.data.settings.updatedAt, batch.settings.updatedAt)) this.dirty.delete('settings');
    batch.unlocks.forEach((r) => this.dirty.delete(`unlock:${r.id}`));
    this.persist();
  }

  /**
   * Merge the server state: the newer `updatedAt` wins per row. Local rows the server has never
   * seen (or has an older copy of) are marked dirty so they get pushed.
   */
  mergeRemote(remote: RemoteSnapshot) {
    const items = { ...this.data.items };
    const days = { ...this.data.days };
    const journal = { ...this.data.journal };
    let settings = this.data.settings;
    const unlocks = { ...this.data.unlocks };

    const seenItems = new Set<string>();
    for (const r of remote.items) {
      seenItems.add(r.key);
      const local = items[r.key];
      const { key, ...state } = r;
      if (!local || state.updatedAt > local.updatedAt) {
        items[key] = state;
        this.dirty.delete(`item:${key}`);
      } else if (local.updatedAt > state.updatedAt) this.dirty.add(`item:${key}`);
      else this.dirty.delete(`item:${key}`);
    }
    for (const k of Object.keys(items)) if (!seenItems.has(k)) this.dirty.add(`item:${k}`);

    const seenDays = new Set<number>();
    for (const r of remote.days) {
      seenDays.add(r.day);
      const local = days[r.day];
      const { day, ...state } = r;
      if (!local || state.updatedAt > local.updatedAt) {
        days[day] = state;
        this.dirty.delete(`day:${day}`);
      } else if (local.updatedAt > state.updatedAt) this.dirty.add(`day:${day}`);
    }
    for (const k of Object.keys(days)) if (!seenDays.has(Number(k))) this.dirty.add(`day:${k}`);

    const seenJ = new Set<number>();
    for (const r of remote.journal) {
      seenJ.add(r.day);
      const local = journal[r.day];
      const { day, ...state } = r;
      if (!local || state.updatedAt > local.updatedAt) {
        journal[day] = state;
        this.dirty.delete(`journal:${day}`);
      } else if (local.updatedAt > state.updatedAt) this.dirty.add(`journal:${day}`);
    }
    for (const k of Object.keys(journal)) if (!seenJ.has(Number(k))) this.dirty.add(`journal:${k}`);

    if (remote.settings && remote.settings.updatedAt > settings.updatedAt) {
      settings = { ...defaultSettings(), ...remote.settings };
      this.dirty.delete('settings');
    } else if (settings.updatedAt > (remote.settings?.updatedAt ?? 0)) this.dirty.add('settings');

    const seenU = new Set<string>();
    for (const u of remote.unlocks) {
      seenU.add(u.id);
      if (!(u.id in unlocks) || u.at < unlocks[u.id]) unlocks[u.id] = u.at;
      this.dirty.delete(`unlock:${u.id}`);
    }
    for (const id of Object.keys(unlocks)) if (!seenU.has(id)) this.dirty.add(`unlock:${id}`);

    this.data = { items, days, journal, settings, unlocks };
    this.emit();
  }

  /** Merge a JSON export (same semantics as a remote snapshot: newest row wins). */
  importSnapshot(s: ProgressData) {
    this.mergeRemote({
      items: Object.entries(s.items).map(([key, v]) => ({ key, ...v })),
      days: Object.entries(s.days).map(([day, v]) => ({ day: Number(day), ...v })),
      journal: Object.entries(s.journal).map(([day, v]) => ({ day: Number(day), ...v })),
      settings: s.settings ?? null,
      unlocks: Object.entries(s.unlocks).map(([id, at]) => ({ id, at })),
    });
    // mergeRemote treats missing remote rows as "needs push"; also push everything we imported.
    for (const k of Object.keys(this.data.items)) this.dirty.add(`item:${k}`);
    for (const k of Object.keys(this.data.days)) this.dirty.add(`day:${k}`);
    for (const k of Object.keys(this.data.journal)) this.dirty.add(`journal:${k}`);
    this.persist();
  }

  /** Wipe the local cache only (the signed-in account's server copy is untouched). */
  clearLocal() {
    this.data = emptyProgress();
    this.dirty.clear();
    this.storage?.removeItem(this.storageKey);
    this.listeners.forEach((l) => l());
  }

  /* ---------- persistence ---------- */
  private persist() {
    if (!this.storage) return;
    try {
      this.storage.setItem(this.storageKey, JSON.stringify({ v: VERSION, data: this.data, dirty: [...this.dirty] }));
    } catch {
      /* storage full or unavailable: the in-memory copy still works and sync still runs */
    }
  }
  private load() {
    if (!this.storage) return;
    try {
      const raw = this.storage.getItem(this.storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { v: number; data: ProgressData; dirty: string[] };
      if (parsed.v !== VERSION) return;
      this.data = {
        ...emptyProgress(),
        ...parsed.data,
        settings: { ...defaultSettings(), ...parsed.data.settings },
      };
      this.dirty = new Set(parsed.dirty);
    } catch {
      /* corrupt cache: start empty; the server copy (if any) repopulates it */
    }
  }
}
