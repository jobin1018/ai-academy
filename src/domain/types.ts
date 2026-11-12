export type StepId = 'learn' | 'design' | 'build' | 'test' | 'challenge' | 'debrief';
export const STEPS: { id: StepId; n: number; title: string; short: string }[] = [
  { id: 'learn', n: 1, title: 'Learn', short: 'Learn' },
  { id: 'design', n: 2, title: 'Understand & design', short: 'Design' },
  { id: 'build', n: 3, title: 'Build', short: 'Build' },
  { id: 'test', n: 4, title: 'Test & verify', short: 'Verify' },
  { id: 'challenge', n: 5, title: "Engineer's challenge", short: 'Challenge' },
  { id: 'debrief', n: 6, title: 'Daily debrief', short: 'Debrief' },
];

/** One tickable thing the user can do. `text` holds answers/notes/evidence; `url` a commit or result link. */
export interface ItemState {
  done: boolean;
  text: string;
  url: string;
  rating: number | null;
  updatedAt: number;
}

export interface DayState {
  completedAt: number | null;
  minutesSpent: number;
  updatedAt: number;
}

export interface JournalEntry {
  learned: string;
  implementedIndependently: string;
  claudeHelped: string;
  canExplain: string;
  problems: string;
  questionsToRevisit: string;
  commitUrl: string;
  updatedAt: number;
}

export type ThemePref = 'dark' | 'light' | 'system';

export interface Settings {
  theme: ThemePref;
  lastDay: number | null;
  lastStep: StepId | null;
  showStreak: boolean;
  updatedAt: number;
}

export interface ProgressData {
  items: Record<string, ItemState>;
  days: Record<number, DayState>;
  journal: Record<number, JournalEntry>;
  settings: Settings;
  /** achievement id -> unlock timestamp */
  unlocks: Record<string, number>;
}

export const emptyItem = (): ItemState => ({ done: false, text: '', url: '', rating: null, updatedAt: 0 });
export const emptyDay = (): DayState => ({ completedAt: null, minutesSpent: 0, updatedAt: 0 });
export const emptyJournal = (): JournalEntry => ({
  learned: '',
  implementedIndependently: '',
  claudeHelped: '',
  canExplain: '',
  problems: '',
  questionsToRevisit: '',
  commitUrl: '',
  updatedAt: 0,
});
export const defaultSettings = (): Settings => ({ theme: 'dark', lastDay: null, lastStep: null, showStreak: false, updatedAt: 0 });
export const emptyProgress = (): ProgressData => ({ items: {}, days: {}, journal: {}, settings: defaultSettings(), unlocks: {} });

export const pad2 = (n: number) => String(n).padStart(2, '0');
/** Stable item key, e.g. d07.build.3.2 */
export const itemKey = (day: number, local: string) => `d${pad2(day)}.${local}`;
export const bossKey = (bossId: number, local: string) => `boss.${bossId}.${local}`;
export const dayOfKey = (key: string): number | null => {
  const m = key.match(/^d(\d{2})\./);
  return m ? Number(m[1]) : null;
};
