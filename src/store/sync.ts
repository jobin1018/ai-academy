import type { ProgressStore, PushBatch, RemoteSnapshot } from './progressStore';

export interface RemoteStore {
  fetchAll(): Promise<RemoteSnapshot>;
  push(batch: PushBatch): Promise<void>;
}

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'offline' | 'error';

export interface SyncState {
  status: SyncStatus;
  pending: number;
  lastSyncedAt: number | null;
  error: string | null;
}

/**
 * Pushes dirty rows to the remote store (debounced) and pulls remote changes (on start, on tab
 * focus, on reconnect). Conflicts resolve per row by newest `updatedAt`. Failed pushes keep their
 * dirty marks, so nothing is lost while offline.
 */
export class SyncEngine {
  private state: SyncState = { status: 'idle', pending: 0, lastSyncedAt: null, error: null };
  private listeners = new Set<() => void>();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private running = false;
  private rerun = false;
  private stopped = false;
  private unsubStore: (() => void) | null = null;
  private lastPull = 0;
  private backoff = 0;

  constructor(
    private readonly store: ProgressStore,
    private readonly remote: RemoteStore,
    private readonly opts: { debounceMs?: number; minPullIntervalMs?: number; now?: () => number } = {},
  ) {}

  subscribe = (l: () => void) => {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  };
  getState = () => this.state;
  private set(patch: Partial<SyncState>) {
    this.state = { ...this.state, ...patch, pending: this.store.dirtyCount() };
    this.listeners.forEach((l) => l());
  }

  async start() {
    this.stopped = false;
    this.unsubStore = this.store.subscribe(() => {
      this.set({});
      this.schedule();
    });
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.onOnline);
      window.addEventListener('offline', this.onOffline);
      document.addEventListener('visibilitychange', this.onVisible);
    }
    await this.sync(true);
  }

  stop() {
    this.stopped = true;
    if (this.timer) clearTimeout(this.timer);
    this.unsubStore?.();
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.onOnline);
      window.removeEventListener('offline', this.onOffline);
      document.removeEventListener('visibilitychange', this.onVisible);
    }
  }

  private onOnline = () => void this.sync(true);
  private onOffline = () => this.set({ status: 'offline' });
  private onVisible = () => {
    if (document.visibilityState !== 'visible') return;
    const now = (this.opts.now ?? Date.now)();
    if (now - this.lastPull > (this.opts.minPullIntervalMs ?? 20_000)) void this.sync(true);
  };

  private schedule() {
    if (this.stopped || !this.store.hasDirty()) return;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.sync(false), (this.opts.debounceMs ?? 1200) + this.backoff);
  }

  /** Flush now (e.g. before the page hides). */
  flush() {
    return this.sync(false);
  }

  async sync(pull: boolean) {
    if (this.stopped) return;
    if (this.running) {
      this.rerun = true;
      return;
    }
    this.running = true;
    this.set({ status: 'syncing', error: null });
    try {
      if (pull) {
        const snap = await this.remote.fetchAll();
        this.store.mergeRemote(snap);
        this.lastPull = (this.opts.now ?? Date.now)();
      }
      const batch = this.store.collectDirty();
      const has = batch.items.length + batch.days.length + batch.journal.length + batch.unlocks.length > 0 || batch.settings;
      if (has) {
        await this.remote.push(batch);
        this.store.markPushed(batch);
      }
      this.backoff = 0;
      this.set({ status: 'synced', lastSyncedAt: (this.opts.now ?? Date.now)() });
    } catch (e) {
      const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
      this.backoff = Math.min((this.backoff || 1500) * 2, 60_000);
      this.set({ status: offline ? 'offline' : 'error', error: e instanceof Error ? e.message : String(e) });
      this.schedule();
    } finally {
      this.running = false;
      if (this.rerun) {
        this.rerun = false;
        this.schedule();
      }
    }
  }
}
