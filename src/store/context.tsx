import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react';
import { unlockedAchievementIds } from '@/domain/progress';
import { emptyItem, type ItemState, type ProgressData } from '@/domain/types';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { ProgressStore } from './progressStore';
import { SupabaseRemote } from './supabaseRemote';
import { SyncEngine, type SyncState } from './sync';

export type Mode = 'cloud' | 'local';

interface Ctx {
  store: ProgressStore;
  engine: SyncEngine | null;
  mode: Mode;
  email: string | null;
  signOut: () => Promise<void>;
  newlyUnlocked: string[];
  dismissUnlocked: () => void;
}
const StoreCtx = createContext<Ctx | null>(null);
const LOCAL_CHOICE = 'aeq:use-local';

function safeStorage(): Storage | null {
  try {
    const s = window.localStorage;
    s.getItem('__t');
    return s;
  } catch {
    return null; // private mode / blocked: the app still works in memory and via sync
  }
}

export type AuthState =
  | { kind: 'loading' }
  | { kind: 'needs-login' }
  | { kind: 'ready'; mode: Mode; userId: string | null; email: string | null };

function useAuthState(): { auth: AuthState; chooseLocal: () => void; signOut: () => Promise<void> } {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [localChoice, setLocalChoice] = useState(() => {
    try {
      return localStorage.getItem(LOCAL_CHOICE) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (!supabase) return;
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const chooseLocal = useCallback(() => {
    try {
      localStorage.setItem(LOCAL_CHOICE, '1');
    } catch {
      /* ignore */
    }
    setLocalChoice(true);
  }, []);

  const signOut = useCallback(async () => {
    try {
      localStorage.removeItem(LOCAL_CHOICE);
    } catch {
      /* ignore */
    }
    setLocalChoice(false);
    await supabase?.auth.signOut();
  }, []);

  let auth: AuthState;
  if (!isSupabaseConfigured) auth = { kind: 'ready', mode: 'local', userId: null, email: null };
  else if (loading) auth = { kind: 'loading' };
  else if (session) auth = { kind: 'ready', mode: 'cloud', userId: session.user.id, email: session.user.email ?? null };
  else if (localChoice) auth = { kind: 'ready', mode: 'local', userId: null, email: null };
  else auth = { kind: 'needs-login' };
  return { auth, chooseLocal, signOut };
}

const AuthCtx = createContext<{ auth: AuthState; chooseLocal: () => void } | null>(null);
export const useAuth = () => {
  const c = useContext(AuthCtx);
  if (!c) throw new Error('AuthProvider missing');
  return c;
};

/** Resolves who is using the app, then mounts the progress store (and sync, when signed in). */
export function AppProviders({ children, fallback }: { children: ReactNode; fallback: (s: { kind: 'loading' | 'needs-login' }) => ReactNode }) {
  const { auth, chooseLocal, signOut } = useAuthState();
  return (
    <AuthCtx.Provider value={{ auth, chooseLocal }}>
      {auth.kind !== 'ready' ? fallback(auth) : <StoreProvider auth={auth} signOut={signOut}>{children}</StoreProvider>}
    </AuthCtx.Provider>
  );
}

function StoreProvider({ auth, signOut, children }: { auth: Extract<AuthState, { kind: 'ready' }>; signOut: () => Promise<void>; children: ReactNode }) {
  const ns = auth.mode === 'cloud' ? `user:${auth.userId}` : 'local';
  const store = useMemo(() => new ProgressStore(ns, safeStorage()), [ns]);
  const engine = useMemo(() => (auth.mode === 'cloud' && supabase && auth.userId ? new SyncEngine(store, new SupabaseRemote(supabase, auth.userId)) : null), [auth.mode, auth.userId, store]);
  const [newlyUnlocked, setNewlyUnlocked] = useState<string[]>([]);

  useEffect(() => {
    void engine?.start();
    const flushOnHide = () => {
      if (document.visibilityState === 'hidden') void engine?.flush();
    };
    document.addEventListener('visibilitychange', flushOnHide);
    return () => {
      document.removeEventListener('visibilitychange', flushOnHide);
      engine?.stop();
    };
  }, [engine]);

  // Record newly earned achievements (derived from real deliverables) and announce them.
  const data = useSyncExternalStore(store.subscribe, store.getSnapshot);
  useEffect(() => {
    const earned = unlockedAchievementIds(data);
    const fresh = earned.filter((id) => !(id in data.unlocks));
    if (fresh.length) {
      store.recordUnlocks(fresh);
      setNewlyUnlocked((prev) => [...prev, ...fresh]);
    }
  }, [data, store]);

  const value = useMemo<Ctx>(
    () => ({ store, engine, mode: auth.mode, email: auth.email, signOut, newlyUnlocked, dismissUnlocked: () => setNewlyUnlocked([]) }),
    [store, engine, auth.mode, auth.email, signOut, newlyUnlocked],
  );
  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

const useCtx = () => {
  const c = useContext(StoreCtx);
  if (!c) throw new Error('Store not available');
  return c;
};

export const useApp = () => useCtx();
export const useStore = () => useCtx().store;
export function useProgress(): ProgressData {
  const store = useStore();
  return useSyncExternalStore(store.subscribe, store.getSnapshot);
}

const idle: SyncState = { status: 'idle', pending: 0, lastSyncedAt: null, error: null };
export function useSyncState(): SyncState {
  const { engine } = useCtx();
  return useSyncExternalStore(
    engine ? engine.subscribe : () => () => {},
    engine ? engine.getState : () => idle,
  );
}

/** One tickable item: its stored state plus a patch function. */
export function useItem(key: string): [ItemState, (patch: Partial<Omit<ItemState, 'updatedAt'>>) => void] {
  const store = useStore();
  const data = useProgress();
  const item = data.items[key] ?? emptyItem();
  const set = useCallback((patch: Partial<Omit<ItemState, 'updatedAt'>>) => store.setItem(key, patch), [store, key]);
  return [item, set];
}
