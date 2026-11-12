import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProgressStore, type KeyValueStorage, type PushBatch, type RemoteSnapshot } from './progressStore';
import { SyncEngine, type RemoteStore } from './sync';
import { dayStatus } from '@/domain/progress';
import { DAYS } from '@/curriculum';

class MemStorage implements KeyValueStorage {
  m = new Map<string, string>();
  getItem(k: string) {
    return this.m.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.m.set(k, v);
  }
  removeItem(k: string) {
    this.m.delete(k);
  }
}

/** In-memory "server" with the same keep-the-newer-row rule as the SQL trigger. */
class FakeServer implements RemoteStore {
  items = new Map<string, PushBatch['items'][number]>();
  days = new Map<number, PushBatch['days'][number]>();
  journal = new Map<number, PushBatch['journal'][number]>();
  settings: RemoteSnapshot['settings'] = null;
  unlocks = new Map<string, number>();
  failNext = 0;
  pushes = 0;

  async fetchAll(): Promise<RemoteSnapshot> {
    if (this.failNext > 0) {
      this.failNext--;
      throw new Error('network down');
    }
    return {
      items: [...this.items.values()],
      days: [...this.days.values()],
      journal: [...this.journal.values()],
      settings: this.settings,
      unlocks: [...this.unlocks].map(([id, at]) => ({ id, at })),
    };
  }
  async push(b: PushBatch) {
    if (this.failNext > 0) {
      this.failNext--;
      throw new Error('network down');
    }
    this.pushes++;
    for (const r of b.items) if (!this.items.has(r.key) || r.updatedAt >= this.items.get(r.key)!.updatedAt) this.items.set(r.key, r);
    for (const r of b.days) if (!this.days.has(r.day) || r.updatedAt >= this.days.get(r.day)!.updatedAt) this.days.set(r.day, r);
    for (const r of b.journal) if (!this.journal.has(r.day) || r.updatedAt >= this.journal.get(r.day)!.updatedAt) this.journal.set(r.day, r);
    if (b.settings && (!this.settings || b.settings.updatedAt >= this.settings.updatedAt)) this.settings = b.settings;
    for (const u of b.unlocks) if (!this.unlocks.has(u.id)) this.unlocks.set(u.id, u.at);
  }
}

let t = 1_000;
const clock = () => ++t;
const device = (server: FakeServer, ns = 'user:1') => {
  const storage = new MemStorage();
  const store = new ProgressStore(ns, storage, clock);
  const engine = new SyncEngine(store, server, { debounceMs: 10 });
  return { storage, store, engine };
};

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('ProgressStore', () => {
  it('persists to storage and restores after a "refresh"', () => {
    const storage = new MemStorage();
    const a = new ProgressStore('user:1', storage, clock);
    a.setItem('d01.learn.1', { done: true, text: 'my notes' });
    a.setDay(1, { minutesSpent: 45 });
    a.setJournal(1, { learned: 'tokens' });
    const b = new ProgressStore('user:1', storage, clock);
    expect(b.getSnapshot().items['d01.learn.1']).toMatchObject({ done: true, text: 'my notes' });
    expect(b.getSnapshot().days[1].minutesSpent).toBe(45);
    expect(b.getSnapshot().journal[1].learned).toBe('tokens');
    expect(b.hasDirty()).toBe(true); // unsynced edits survive a refresh
  });

  it('keeps accounts separate on the same browser', () => {
    const storage = new MemStorage();
    new ProgressStore('user:1', storage, clock).setItem('d01.learn.1', { done: true });
    expect(new ProgressStore('user:2', storage, clock).getSnapshot().items).toEqual({});
  });

  it('survives a corrupt cache', () => {
    const storage = new MemStorage();
    storage.setItem('aeq:v1:user:1', '{not json');
    expect(() => new ProgressStore('user:1', storage, clock)).not.toThrow();
  });

  it('ignores no-op writes so autosave does not flood the sync queue', () => {
    const s = new ProgressStore('x', null, clock);
    s.setItem('k', { text: 'a' });
    s.markPushed(s.collectDirty());
    s.setItem('k', { text: 'a' });
    expect(s.hasDirty()).toBe(false);
  });
});

describe('cross-device sync', () => {
  it('pushes local edits and a second device sees them', async () => {
    const server = new FakeServer();
    const laptop = device(server);
    const phone = device(server);
    await laptop.engine.start();
    await phone.engine.start();

    laptop.store.setItem('d01.build.3.2', { done: true });
    laptop.store.setDay(1, { completedAt: 5_000, minutesSpent: 360 });
    await vi.advanceTimersByTimeAsync(50);
    expect(server.items.get('d01.build.3.2')?.done).toBe(true);

    await phone.engine.sync(true); // e.g. the phone comes back to the foreground
    expect(phone.store.getSnapshot().items['d01.build.3.2'].done).toBe(true);
    expect(phone.store.getSnapshot().days[1].completedAt).toBe(5_000);
    laptop.engine.stop();
    phone.engine.stop();
  });

  it('newest edit wins per row when both devices edit the same item', async () => {
    const server = new FakeServer();
    const a = device(server);
    const b = device(server);
    await a.engine.start();
    await b.engine.start();
    a.store.setItem('d02.design', { done: true, text: 'older note' });
    await vi.advanceTimersByTimeAsync(50);
    await b.engine.sync(true);
    b.store.setItem('d02.design', { text: 'newer note from the phone' });
    await vi.advanceTimersByTimeAsync(50);
    await a.engine.sync(true);
    expect(a.store.getSnapshot().items['d02.design'].text).toBe('newer note from the phone');
    expect(a.store.getSnapshot().items['d02.design'].done).toBe(true);
    a.engine.stop();
    b.engine.stop();
  });

  it('merges edits to different items without losing either', async () => {
    const server = new FakeServer();
    const a = device(server);
    const b = device(server);
    await a.engine.start();
    await b.engine.start();
    a.store.setItem('d03.build.3.1', { done: true });
    b.store.setItem('d03.build.3.2', { done: true });
    await vi.advanceTimersByTimeAsync(50);
    await a.engine.sync(true);
    await b.engine.sync(true);
    for (const dev of [a, b]) {
      expect(dev.store.getSnapshot().items['d03.build.3.1'].done).toBe(true);
      expect(dev.store.getSnapshot().items['d03.build.3.2'].done).toBe(true);
    }
    a.engine.stop();
    b.engine.stop();
  });

  it('keeps edits made offline and pushes them when the connection returns', async () => {
    const server = new FakeServer();
    const a = device(server);
    await a.engine.start();
    server.failNext = 2;
    a.store.setItem('d04.test.1', { done: true });
    await vi.advanceTimersByTimeAsync(100);
    expect(a.engine.getState().status).toBe('error');
    expect(a.store.hasDirty()).toBe(true);
    expect(server.items.size).toBe(0);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(server.items.get('d04.test.1')?.done).toBe(true);
    expect(a.engine.getState().status).toBe('synced');
    expect(a.store.hasDirty()).toBe(false);
    a.engine.stop();
  });

  it('uploads progress made before the first sync (a new device with local work)', async () => {
    const server = new FakeServer();
    const a = device(server);
    a.store.setItem('d01.learn.1', { done: true, text: 'done before sign-in' });
    await a.engine.start();
    expect(server.items.get('d01.learn.1')?.text).toBe('done before sign-in');
    a.engine.stop();
  });

  it('never lets a stale device overwrite newer server data', async () => {
    const server = new FakeServer();
    const fresh = device(server);
    await fresh.engine.start();
    fresh.store.setItem('d05.debrief.log', { done: true, text: 'newest' });
    await vi.advanceTimersByTimeAsync(50);

    const stale = device(server);
    stale.store.setItem('d05.debrief.log', { done: true, text: 'from long ago' });
    // make the stale write genuinely older than the server copy
    const snap = stale.store.getSnapshot();
    stale.store.mergeRemote({ items: [], days: [], journal: [], settings: null, unlocks: [] });
    snap.items['d05.debrief.log'].updatedAt = 1;
    await stale.engine.start();
    expect(server.items.get('d05.debrief.log')?.text).toBe('newest');
    expect(stale.store.getSnapshot().items['d05.debrief.log'].text).toBe('newest');
    fresh.engine.stop();
    stale.engine.stop();
  });

  it('records achievement unlocks once and syncs them', async () => {
    const server = new FakeServer();
    const a = device(server);
    await a.engine.start();
    a.store.recordUnlocks(['first-llm-api-integration']);
    a.store.recordUnlocks(['first-llm-api-integration']);
    await vi.advanceTimersByTimeAsync(50);
    expect([...server.unlocks.keys()]).toEqual(['first-llm-api-integration']);
    a.engine.stop();
  });

  it('exports and re-imports progress without losing completion', () => {
    const s = new ProgressStore('a', null, clock);
    s.setDay(1, { completedAt: 123, minutesSpent: 400 });
    s.setItem('d01.verify', { done: true, text: 'all green, commit abc' });
    const exported = JSON.parse(JSON.stringify(s.getSnapshot()));
    const fresh = new ProgressStore('b', null, clock);
    fresh.importSnapshot(exported);
    expect(fresh.getSnapshot().days[1].completedAt).toBe(123);
    expect(dayStatus(fresh.getSnapshot(), DAYS[0]).completed).toBe(true);
    expect(fresh.hasDirty()).toBe(true);
  });
});
