import data from './data/curriculum.generated.json';
import type { BossFight, Curriculum, Day, Level, Resource } from './schema';

// The generated file is validated against the zod schema in tests (curriculum.test.ts) rather than
// on every page load.
export const curriculum = data as unknown as Curriculum;

export const DAYS: Day[] = curriculum.days;
export const LEVELS: Level[] = curriculum.levels;
export const RESOURCES: Resource[] = curriculum.resources;
export const BOSS_FIGHTS: BossFight[] = curriculum.bossFights;
export const ACHIEVEMENTS = curriculum.achievements;
export const START_DATE = '2026-11-12';

const dayMap = new Map(DAYS.map((d) => [d.day, d]));
const resMap = new Map(RESOURCES.map((r) => [r.id, r]));

export const getDay = (n: number): Day | undefined => dayMap.get(n);
export const getResource = (id: string): Resource | undefined => resMap.get(id);
export const getLevel = (id: number): Level => LEVELS.find((l) => l.id === id) ?? LEVELS[0];
export const getBoss = (id: number): BossFight | undefined => BOSS_FIGHTS.find((b) => b.id === id);
export const daysOfLevel = (id: number): Day[] => DAYS.filter((d) => d.level === id);

/** The boss fight that gates (or belongs to) a day, if any. Boss Fight 4 spans Days 29–30. */
export const bossForDay = (n: number): BossFight | undefined => BOSS_FIGHTS.find((b) => b.days.includes(n));
