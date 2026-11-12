import { BOSS_FIGHTS, DAYS, LEVELS, ACHIEVEMENTS, bossForDay, getBoss, curriculum } from '@/curriculum';
import type { BossFight, Day } from '@/curriculum/schema';
import { SKILLS, XP, type XpBucket } from '@/curriculum/meta';
import { bossKey, emptyItem, itemKey, type ItemState, type ProgressData, type StepId } from './types';

/* -------------------------------------------------------------------------------------------
 * Slots: the real tasks of a day. Every checkbox, XP point and "mandatory" flag is derived from
 * these, which are in turn derived from the imported curriculum. Nothing is typed in by hand.
 * ----------------------------------------------------------------------------------------- */

export type SlotStep = StepId | 'verify';

export interface Slot {
  key: string; // local key; the stored key is itemKey(day, key)
  step: SlotStep;
  bucket: XpBucket | null; // null: no XP (bonus, sign-off)
  label: string;
  mandatory: boolean;
  /** Minimum characters of written text needed for the slot to count as done. */
  minChars: number;
  /** Satisfied if any of these local keys is satisfied (alternative learning options). */
  anyOf?: string[];
  /** Satisfied only with a written note or a link as evidence. */
  needsEvidence?: boolean;
  aiFree?: boolean;
  boss?: { bossId: number; tasks?: number[]; needPass?: boolean };
}

const MIN_ANSWER = 10;
const MIN_WRITING = 20;

export function getSlots(day: Day): Slot[] {
  const slots: Slot[] = [];

  // LEARN: one slot per learning item; Option A / Option B items are alternatives (one is enough).
  const alts = day.learn.items.filter((i) => i.isAlternative);
  day.learn.items.forEach((it) => {
    if (it.isAlternative) return;
    slots.push({
      key: `learn.${it.index}`,
      step: 'learn',
      bucket: 'learn',
      label: it.title,
      mandatory: true,
      // Always needs a written note: answers to the checks, or the exercise result when there are none.
      minChars: MIN_ANSWER,
    });
  });
  if (alts.length) {
    slots.push({
      key: `learn.${alts[0].index}`,
      step: 'learn',
      bucket: 'learn',
      label: 'Learning option (A or B)',
      mandatory: true,
      minChars: MIN_ANSWER,
      anyOf: alts.map((a) => `learn.${a.index}`),
    });
  }

  // DESIGN
  slots.push({ key: 'design', step: 'design', bucket: 'design', label: 'Design exercise written down', mandatory: true, minChars: MIN_WRITING, aiFree: day.design.aiFree });
  if (day.design.designReview) {
    slots.push({ key: 'design.review', step: 'design', bucket: 'design', label: 'Design reviewed in the mentoring chat', mandatory: true, minChars: 0 });
  }

  // BUILD
  for (const t of day.build.tasks) {
    slots.push({
      key: `build.${t.id}`,
      step: 'build',
      bucket: t.optional ? null : 'build',
      label: `Task ${t.id} — ${t.title}`,
      mandatory: !t.optional,
      minChars: 0,
      aiFree: t.labels.includes('ai-free-task') && !t.labels.includes('claude-code-allowed'),
    });
  }

  // TEST
  day.test.items.forEach((_, i) => {
    slots.push({ key: `test.${i + 1}`, step: 'test', bucket: 'test', label: `Verification ${i + 1}`, mandatory: true, minChars: 0 });
  });
  slots.push({ key: 'test.evidence', step: 'test', bucket: 'test', label: 'Evidence recorded (results or commit link)', mandatory: true, minChars: 0, needsEvidence: true });

  // CHALLENGE
  if (day.challenge.kind === 'boss' && day.challenge.bossFightId) {
    const bossId = day.challenge.bossFightId;
    slots.push({
      key: 'boss',
      step: 'challenge',
      bucket: 'wrap',
      label: `Boss Fight ${bossId}`,
      mandatory: true,
      minChars: 0,
      boss: bossId === 4 ? { bossId, tasks: [1] } : { bossId, needPass: true },
    });
  } else {
    slots.push({ key: 'challenge', step: 'challenge', bucket: 'wrap', label: "Engineer's challenge answered", mandatory: true, minChars: MIN_WRITING, aiFree: day.challenge.aiFree });
  }

  // DEBRIEF
  day.debrief.questions.forEach((_, i) => {
    slots.push({ key: `debrief.q${i + 1}`, step: 'debrief', bucket: 'wrap', label: `Interview question ${i + 1} answered`, mandatory: true, minChars: MIN_WRITING, aiFree: day.debrief.aiFree });
  });
  slots.push({ key: 'debrief.log', step: 'debrief', bucket: 'wrap', label: 'Learning-log entry written', mandatory: true, minChars: MIN_WRITING });

  // SIGN-OFF (no XP): the day's own "mission passed when" condition, self-attested with evidence.
  slots.push({ key: 'verify', step: 'verify', bucket: null, label: 'Mission-passed condition met (with evidence)', mandatory: true, minChars: MIN_ANSWER, needsEvidence: true });
  if (day.day === 30) {
    slots.push({ key: 'boss', step: 'verify', bucket: null, label: 'Boss Fight 4 passed', mandatory: true, minChars: 0, boss: { bossId: 4, needPass: true } });
  }

  // BONUS (no XP)
  if (day.priorities.ifTimeRemains) {
    slots.push({ key: 'bonus', step: 'verify', bucket: null, label: 'Bonus: IF TIME REMAINS item', mandatory: false, minChars: 0 });
  }
  return slots;
}

const slotsCache = new Map<number, Slot[]>();
export function slotsOf(day: Day): Slot[] {
  let s = slotsCache.get(day.day);
  if (!s) {
    s = getSlots(day);
    slotsCache.set(day.day, s);
  }
  return s;
}

/* ---------------------------------------------------------------------------------------- */

export const itemOf = (data: ProgressData, day: number, local: string): ItemState => data.items[itemKey(day, local)] ?? emptyItem();
const lenOk = (it: ItemState, min: number) => it.text.trim().length >= min;

function itemSatisfied(data: ProgressData, day: number, local: string, slot: Slot): boolean {
  const it = itemOf(data, day, local);
  if (!it.done) return false;
  if (slot.needsEvidence) return it.text.trim().length >= MIN_ANSWER || it.url.trim().length > 0;
  return lenOk(it, slot.minChars);
}

export function slotSatisfied(data: ProgressData, day: number, slot: Slot): boolean {
  if (slot.boss) {
    const b = getBoss(slot.boss.bossId);
    if (!b) return false;
    const p = bossProgress(b, data);
    if (slot.boss.tasks) return slot.boss.tasks.every((t) => p.taskDone[t]);
    return p.status === 'passed' || (p.status === 'partial' && slot.boss.bossId === 3);
  }
  if (slot.anyOf) return slot.anyOf.some((k) => itemSatisfied(data, day, k, slot));
  return itemSatisfied(data, day, slot.key, slot);
}

/** 0..1 credit for a slot. Boss slots give proportional credit before they pass. */
export function slotScore(data: ProgressData, day: number, slot: Slot): number {
  if (slotSatisfied(data, day, slot)) return 1;
  if (slot.boss) {
    const b = getBoss(slot.boss.bossId);
    if (!b) return 0;
    const p = bossProgress(b, data);
    const want = slot.boss.tasks ?? b.tasks.map((t) => t.id);
    return want.filter((t) => p.taskDone[t]).length / want.length;
  }
  return 0;
}

/* ------------------------------------------ XP -------------------------------------------- */

export interface DayXp {
  total: number;
  buckets: Record<XpBucket, { earned: number; max: number }>;
}

export function dayXp(data: ProgressData, day: Day): DayXp {
  const slots = slotsOf(day);
  const buckets = {} as DayXp['buckets'];
  let total = 0;
  for (const b of Object.keys(XP) as XpBucket[]) {
    const inB = slots.filter((s) => s.bucket === b);
    const mean = inB.length ? inB.reduce((a, s) => a + slotScore(data, day.day, s), 0) / inB.length : 0;
    const earned = Math.round(XP[b] * mean);
    buckets[b] = { earned, max: XP[b] };
    total += earned;
  }
  return { total, buckets };
}

export function totalXp(data: ProgressData): number {
  return DAYS.reduce((a, d) => a + dayXp(data, d).total, 0);
}

/* ---------------------------------- step + day progress ----------------------------------- */

export function stepProgress(data: ProgressData, day: Day, step: SlotStep): { done: number; total: number; fraction: number } {
  const slots = slotsOf(day).filter((s) => s.step === step && s.mandatory);
  const done = slots.filter((s) => slotSatisfied(data, day.day, s)).length;
  return { done, total: slots.length, fraction: slots.length ? done / slots.length : 1 };
}

export interface DayStatus {
  completed: boolean;
  completedAt: number | null;
  mandatoryDone: number;
  mandatoryTotal: number;
  missing: Slot[];
  /** 0..100 */
  percent: number;
  xp: DayXp;
  canComplete: boolean;
}

export function dayStatus(data: ProgressData, day: Day): DayStatus {
  const slots = slotsOf(day).filter((s) => s.mandatory);
  const missing = slots.filter((s) => !slotSatisfied(data, day.day, s));
  const ds = data.days[day.day];
  const completed = !!ds?.completedAt;
  const done = slots.length - missing.length;
  return {
    completed,
    completedAt: ds?.completedAt ?? null,
    mandatoryDone: done,
    mandatoryTotal: slots.length,
    missing,
    percent: completed ? 100 : Math.round((100 * done) / slots.length),
    xp: dayXp(data, day),
    canComplete: missing.length === 0,
  };
}

export const STEP_ORDER: StepId[] = ['learn', 'design', 'build', 'test', 'challenge', 'debrief'];

/** First step that still has mandatory work: where "Continue" should land. */
export function resumeStep(data: ProgressData, day: Day): StepId | 'complete' {
  for (const s of STEP_ORDER) if (stepProgress(data, day, s).fraction < 1) return s;
  return 'complete';
}

/** Lowest-numbered day that is not completed (the day to work on); 30 once everything is done. */
export function currentDay(data: ProgressData): Day {
  return DAYS.find((d) => !data.days[d.day]?.completedAt) ?? DAYS[DAYS.length - 1];
}

export const completedDays = (data: ProgressData) => DAYS.filter((d) => !!data.days[d.day]?.completedAt);

/** Rough minutes left today, proportional to unearned XP. Labelled approximate in the UI. */
export function minutesRemaining(data: ProgressData, day: Day): number {
  const st = dayStatus(data, day);
  if (st.completed) return 0;
  return Math.round((day.plannedHours * 60 * (100 - st.xp.total)) / 100);
}

/* ---------------------------------------- boss -------------------------------------------- */

export type BossStatus = 'not-started' | 'in-progress' | 'partial' | 'passed';

export interface BossProgress {
  status: BossStatus;
  taskDone: Record<number, boolean>;
  taskCut: Record<number, boolean>;
  evidenceOk: boolean;
  acceptanceOk: boolean;
  acceptanceTotal: number;
  acceptanceDone: number;
  fraction: number;
}

const bi = (data: ProgressData, id: number, local: string): ItemState => data.items[bossKey(id, local)] ?? emptyItem();

export function acceptanceKeys(boss: BossFight, groups: { items: string[] }[]): string[] {
  if (boss.id !== 4) return [];
  return groups.flatMap((g, gi) => g.items.map((_, ii) => `acc.${gi}.${ii}`));
}

export function bossProgress(boss: BossFight, data: ProgressData, acceptanceGroups?: { items: string[] }[]): BossProgress {
  const taskDone: Record<number, boolean> = {};
  const taskCut: Record<number, boolean> = {};
  for (const t of boss.tasks) {
    taskDone[t.id] = bi(data, boss.id, `t${t.id}`).done;
    const cut = bi(data, boss.id, `cut${t.id}`);
    taskCut[t.id] = t.cuttable && cut.done && cut.text.trim().length >= MIN_ANSWER;
  }
  const evidence = bi(data, boss.id, 'evidence');
  const evidenceOk = evidence.text.trim().length >= MIN_ANSWER || evidence.url.trim().length > 0;
  const groups = acceptanceGroups ?? bossAcceptanceGroups();
  const accKeys = acceptanceKeys(boss, groups);
  // An acceptance item counts when ticked, or when it carries a written, dated plan.
  const acceptanceDone = accKeys.filter((k) => {
    const it = bi(data, boss.id, k);
    return it.done || it.text.trim().length >= MIN_ANSWER;
  }).length;
  const acceptanceOk = accKeys.length === 0 || acceptanceDone === accKeys.length;

  const required = boss.tasks;
  const satisfiedTasks = required.filter((t) => taskDone[t.id] || taskCut[t.id]);
  const allTasks = satisfiedTasks.length === required.length;
  const anyCut = required.some((t) => !taskDone[t.id] && taskCut[t.id]);
  const anyProgress = required.some((t) => taskDone[t.id] || taskCut[t.id]) || evidenceOk;

  let status: BossStatus = 'not-started';
  if (anyProgress) status = 'in-progress';
  if (allTasks && evidenceOk && acceptanceOk) status = anyCut ? 'partial' : 'passed';
  const fraction = required.filter((t) => taskDone[t.id]).length / required.length;
  return { status, taskDone, taskCut, evidenceOk, acceptanceOk, acceptanceTotal: accKeys.length, acceptanceDone, fraction };
}

export const bossAcceptanceGroups = () => curriculum.acceptanceChecklist;

/* ------------------------------------- levels / weeks -------------------------------------- */

export function levelProgress(data: ProgressData, levelId: number) {
  const days = DAYS.filter((d) => d.level === levelId);
  const done = days.filter((d) => data.days[d.day]?.completedAt).length;
  const xp = days.reduce((a, d) => a + dayXp(data, d).total, 0);
  const percent = Math.round(days.reduce((a, d) => a + dayStatus(data, d).percent, 0) / days.length);
  return { done, total: days.length, xp, maxXp: days.length * 100, percent, complete: done === days.length };
}

export const weekOf = (day: number) => Math.ceil(day / 7);
export function weekProgress(data: ProgressData, week: number) {
  const days = DAYS.filter((d) => weekOf(d.day) === week);
  return {
    week,
    days: days.map((d) => d.day),
    done: days.filter((d) => data.days[d.day]?.completedAt).length,
    total: days.length,
    xp: days.reduce((a, d) => a + dayXp(data, d).total, 0),
    minutes: days.reduce((a, d) => a + (data.days[d.day]?.minutesSpent ?? 0), 0),
    plannedHours: days.reduce((a, d) => a + d.plannedHours, 0),
  };
}

export function overallPercent(data: ProgressData): number {
  return Math.round(DAYS.reduce((a, d) => a + dayStatus(data, d).percent, 0) / DAYS.length);
}

export function hoursSummary(data: ProgressData) {
  const planned = DAYS.reduce((a, d) => a + d.plannedHours, 0);
  const actualMin = DAYS.reduce((a, d) => a + (data.days[d.day]?.minutesSpent ?? 0), 0);
  const plannedDone = DAYS.filter((d) => data.days[d.day]?.completedAt).reduce((a, d) => a + d.plannedHours, 0);
  return { planned, actualHours: actualMin / 60, plannedDone };
}

/* ----------------------------------------- skills ----------------------------------------- */

export interface SkillProgress {
  id: string;
  name: string;
  blurb: string;
  days: readonly number[];
  /** Mandatory tasks done / total across the skill's days (task completion). */
  taskPercent: number;
  /** AI-free tasks done / total across the skill's days (independently demonstrated). */
  demonstratedPercent: number;
  demonstratedDone: number;
  demonstratedTotal: number;
}

export function skillProgress(data: ProgressData): SkillProgress[] {
  return SKILLS.map((s) => {
    let done = 0;
    let total = 0;
    let aiDone = 0;
    let aiTotal = 0;
    for (const dn of s.days) {
      const day = DAYS.find((d) => d.day === dn)!;
      for (const slot of slotsOf(day)) {
        if (!slot.mandatory) continue;
        const sat = slotSatisfied(data, dn, slot);
        total++;
        if (sat) done++;
        if (slot.aiFree) {
          aiTotal++;
          if (sat) aiDone++;
        }
      }
    }
    return {
      id: s.id,
      name: s.name,
      blurb: s.blurb,
      days: s.days,
      taskPercent: total ? Math.round((100 * done) / total) : 0,
      demonstratedPercent: aiTotal ? Math.round((100 * aiDone) / aiTotal) : 0,
      demonstratedDone: aiDone,
      demonstratedTotal: aiTotal,
    };
  });
}

export const skillsOfDay = (day: number) => SKILLS.filter((s) => (s.days as readonly number[]).includes(day));

/* -------------------------------------- achievements -------------------------------------- */

export function unlockedAchievementIds(data: ProgressData): string[] {
  const out: string[] = [];
  for (const a of ACHIEVEMENTS) {
    let ok: boolean;
    if (a.bossFightId) {
      const b = getBoss(a.bossFightId);
      const p = b ? bossProgress(b, data) : null;
      ok = !!p && (p.status === 'passed' || (p.status === 'partial' && a.bossFightId === 3));
    } else {
      ok = a.days.length > 0 && a.days.every((d) => !!data.days[d]?.completedAt);
    }
    if (ok) out.push(a.id);
  }
  return out;
}

/** The next boss fight (by day) still unpassed, else the next achievement not yet unlocked. */
export function nextMilestone(data: ProgressData): { title: string; detail: string; day: number } | null {
  const unlocked = new Set(unlockedAchievementIds(data));
  const bossLastDay = (b: BossFight) => b.days[b.days.length - 1];
  const nextBoss = BOSS_FIGHTS.filter((b) => !unlocked.has(ACHIEVEMENTS.find((a) => a.bossFightId === b.id)?.id ?? '')).sort((a, b) => bossLastDay(a) - bossLastDay(b))[0];
  if (nextBoss) {
    return { title: `Boss Fight ${nextBoss.id}: ${nextBoss.name}`, detail: `Day ${bossLastDay(nextBoss)} · ${LEVELS.find((l) => l.id === nextBoss.id)?.title ?? ''}`, day: bossLastDay(nextBoss) };
  }
  return null;
}

/* ------------------------------------------ rhythm ----------------------------------------- */

const dayStr = (t: number) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Dates on which anything was recorded. Used for an optional, non-punitive rhythm indicator. */
export function activeDates(data: ProgressData): Set<string> {
  const s = new Set<string>();
  for (const it of Object.values(data.items)) if (it.updatedAt && (it.done || it.text)) s.add(dayStr(it.updatedAt));
  for (const d of Object.values(data.days)) if (d.completedAt) s.add(dayStr(d.completedAt));
  return s;
}

export function streakInfo(data: ProgressData, now = Date.now()) {
  const dates = activeDates(data);
  let streak = 0;
  const cursor = new Date(now);
  if (!dates.has(dayStr(cursor.getTime()))) cursor.setDate(cursor.getDate() - 1); // today not over yet
  while (dates.has(dayStr(cursor.getTime()))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return { studyDays: dates.size, streak };
}

export { bossForDay, itemKey };
