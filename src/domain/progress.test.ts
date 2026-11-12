import { describe, expect, it } from 'vitest';
import { DAYS, BOSS_FIGHTS, getBoss } from '@/curriculum';
import {
  bossProgress,
  currentDay,
  dayStatus,
  dayXp,
  levelProgress,
  minutesRemaining,
  nextMilestone,
  overallPercent,
  resumeStep,
  skillProgress,
  slotsOf,
  streakInfo,
  totalXp,
  unlockedAchievementIds,
  bossAcceptanceGroups,
  weekProgress,
} from './progress';
import { bossKey, emptyProgress, itemKey, type ProgressData } from './types';

const now = 1_800_000_000_000;
const text = 'a sufficiently long written answer for the check';

function setItem(data: ProgressData, key: string, patch: Partial<ProgressData['items'][string]>) {
  const prev = data.items[key] ?? { done: false, text: '', url: '', rating: null, updatedAt: now };
  data.items[key] = { ...prev, ...patch };
}

/** Satisfy every slot of a day exactly as a user would: tick plus the required writing. */
function fillDay(data: ProgressData, dayNo: number, opts: { skipBoss?: boolean } = {}) {
  const day = DAYS[dayNo - 1];
  for (const s of slotsOf(day)) {
    if (s.boss) {
      if (!opts.skipBoss) fillBoss(data, s.boss.bossId);
      continue;
    }
    const keys = s.anyOf ? [s.anyOf[0]] : [s.key];
    for (const k of keys) setItem(data, itemKey(dayNo, k), { done: true, text: s.minChars || s.needsEvidence ? text : '' });
  }
}
function fillBoss(data: ProgressData, id: number, opts: { cut?: number[] } = {}) {
  const b = BOSS_FIGHTS.find((x) => x.id === id)!;
  for (const t of b.tasks) {
    if (opts.cut?.includes(t.id)) setItem(data, bossKey(id, `cut${t.id}`), { done: true, text });
    else setItem(data, bossKey(id, `t${t.id}`), { done: true });
  }
  setItem(data, bossKey(id, 'evidence'), { text });
  if (id === 4) bossAcceptanceGroups().forEach((g, gi) => g.items.forEach((_, ii) => setItem(data, bossKey(4, `acc.${gi}.${ii}`), { done: true })));
}
function complete(data: ProgressData, dayNo: number) {
  fillDay(data, dayNo);
  data.days[dayNo] = { completedAt: now, minutesSpent: DAYS[dayNo - 1].plannedHours * 60, updatedAt: now };
}

describe('XP', () => {
  it('starts at zero on a fresh account, with no fake progress', () => {
    const d = emptyProgress();
    expect(totalXp(d)).toBe(0);
    expect(overallPercent(d)).toBe(0);
    expect(currentDay(d).day).toBe(1);
    expect(unlockedAchievementIds(d)).toEqual([]);
  });

  it('awards exactly 100 XP for a fully finished day and 3000 XP for all 30', () => {
    const d = emptyProgress();
    for (let n = 1; n <= 30; n++) {
      fillDay(d, n);
      expect(dayXp(d, DAYS[n - 1]).total, `day ${n}`).toBe(100);
    }
    expect(totalXp(d)).toBe(3000);
  });

  it('splits a finished day 20/20/35/15/10 across its mission buckets', () => {
    const d = emptyProgress();
    fillDay(d, 1);
    const x = dayXp(d, DAYS[0]).buckets;
    expect([x.learn.earned, x.design.earned, x.build.earned, x.test.earned, x.wrap.earned]).toEqual([20, 20, 35, 15, 10]);
  });

  it('gives partial credit inside a mission only (e.g. 2 of 3 tasks = 23 of 35)', () => {
    const d = emptyProgress();
    const day = DAYS.find((x) => x.build.tasks.filter((t) => !t.optional).length === 3)!;
    const tasks = day.build.tasks.filter((t) => !t.optional);
    setItem(d, itemKey(day.day, `build.${tasks[0].id}`), { done: true });
    setItem(d, itemKey(day.day, `build.${tasks[1].id}`), { done: true });
    expect(dayXp(d, day).buckets.build.earned).toBe(23);
    expect(dayXp(d, day).total).toBe(23);
  });

  it('does not reward ticking a learning box without the written answers', () => {
    const d = emptyProgress();
    const day = DAYS[0];
    day.learn.items.forEach((it) => setItem(d, itemKey(1, `learn.${it.index}`), { done: true }));
    expect(dayXp(d, day).buckets.learn.earned).toBe(0);
    day.learn.items.forEach((it) => setItem(d, itemKey(1, `learn.${it.index}`), { done: true, text }));
    expect(dayXp(d, day).buckets.learn.earned).toBe(20);
  });

  it('does not reward text without the tick either', () => {
    const d = emptyProgress();
    DAYS[0].learn.items.forEach((it) => setItem(d, itemKey(1, `learn.${it.index}`), { done: false, text }));
    expect(dayXp(d, DAYS[0]).total).toBe(0);
  });

  it('never exceeds 100 XP per day even when bonus items are ticked', () => {
    const d = emptyProgress();
    fillDay(d, 5);
    setItem(d, itemKey(5, 'bonus'), { done: true });
    expect(dayXp(d, DAYS[4]).total).toBe(100);
  });
});

describe('mission completion', () => {
  it('is blocked until every mandatory item is satisfied, and lists what is missing', () => {
    const d = emptyProgress();
    const day = DAYS[1];
    expect(dayStatus(d, day).canComplete).toBe(false);
    expect(dayStatus(d, day).missing.length).toBe(slotsOf(day).filter((s) => s.mandatory).length);
    fillDay(d, 2);
    expect(dayStatus(d, day).canComplete).toBe(true);
  });

  it('does not pass on watching resources alone', () => {
    const d = emptyProgress();
    const day = DAYS[2];
    day.learn.items.forEach((it) => setItem(d, itemKey(3, `learn.${it.index}`), { done: true, text }));
    const st = dayStatus(d, day);
    expect(st.canComplete).toBe(false);
    expect(st.xp.total).toBe(20);
  });

  it('requires evidence for the mission-passed attestation and for the test evidence', () => {
    const d = emptyProgress();
    fillDay(d, 4);
    setItem(d, itemKey(4, 'verify'), { done: true, text: '' });
    expect(dayStatus(d, DAYS[3]).canComplete).toBe(false);
    setItem(d, itemKey(4, 'verify'), { done: true, text: '', url: 'https://github.com/x/y/commit/abc' });
    expect(dayStatus(d, DAYS[3]).canComplete).toBe(true);
    setItem(d, itemKey(4, 'test.evidence'), { done: true, text: '', url: '' });
    expect(dayStatus(d, DAYS[3]).canComplete).toBe(false);
  });

  it('treats Option A / Option B learning (Day 19) as alternatives', () => {
    const d = emptyProgress();
    const day = DAYS[18];
    const alts = day.learn.items.filter((i) => i.isAlternative);
    expect(alts).toHaveLength(2);
    setItem(d, itemKey(19, `learn.${alts[1].index}`), { done: true, text });
    expect(dayStatus(d, day).missing.some((s) => s.step === 'learn')).toBe(false);
  });

  it('resumes at the first step that still has mandatory work', () => {
    const d = emptyProgress();
    expect(resumeStep(d, DAYS[0])).toBe('learn');
    DAYS[0].learn.items.forEach((it) => setItem(d, itemKey(1, `learn.${it.index}`), { done: true, text }));
    expect(resumeStep(d, DAYS[0])).toBe('design');
    fillDay(d, 1);
    expect(resumeStep(d, DAYS[0])).toBe('complete');
  });

  it('moves the current day to the first uncompleted day and keeps revisited days intact', () => {
    const d = emptyProgress();
    complete(d, 1);
    complete(d, 2);
    expect(currentDay(d).day).toBe(3);
    d.days[1] = { ...d.days[1], completedAt: null };
    expect(currentDay(d).day).toBe(1);
    expect(dayStatus(d, DAYS[0]).xp.total).toBe(100); // reopening keeps the work
  });

  it('estimates remaining time from unearned XP', () => {
    const d = emptyProgress();
    expect(minutesRemaining(d, DAYS[0])).toBe(360);
    fillDay(d, 1);
    expect(minutesRemaining(d, DAYS[0])).toBe(0);
    expect(minutesRemaining(emptyProgress(), DAYS[6])).toBe(300); // Day 7 is a 5 h day
  });
});

describe('boss fights', () => {
  it('requires every task plus evidence before Day 7 can complete', () => {
    const d = emptyProgress();
    fillDay(d, 7, { skipBoss: true });
    expect(dayStatus(d, DAYS[6]).canComplete).toBe(false);
    fillBoss(d, 1);
    expect(bossProgress(getBoss(1)!, d).status).toBe('passed');
    expect(dayStatus(d, DAYS[6]).canComplete).toBe(true);
  });

  it('does not pass with all tasks but no evidence', () => {
    const d = emptyProgress();
    fillBoss(d, 2);
    setItem(d, bossKey(2, 'evidence'), { text: '' });
    expect(bossProgress(getBoss(2)!, d).status).toBe('in-progress');
  });

  it('allows Boss Fight 3 to be Partial when the judge/tracing task is formally cut', () => {
    const d = emptyProgress();
    fillBoss(d, 3, { cut: [5] });
    const p = bossProgress(getBoss(3)!, d);
    expect(p.status).toBe('partial');
    fillDay(d, 21);
    expect(dayStatus(d, DAYS[20]).canComplete).toBe(true);
    expect(unlockedAchievementIds(d)).toContain('boss-3-the-ai-engineer');
  });

  it('does not allow a non-cuttable task to be cut', () => {
    const d = emptyProgress();
    fillBoss(d, 3, { cut: [1] });
    expect(bossProgress(getBoss(3)!, d).status).toBe('in-progress');
  });

  it('splits Boss Fight 4: Day 29 needs Mock 5, Day 30 needs the whole fight and the acceptance criteria', () => {
    const d = emptyProgress();
    fillDay(d, 29, { skipBoss: true });
    expect(dayStatus(d, DAYS[28]).canComplete).toBe(false);
    setItem(d, bossKey(4, 't1'), { done: true });
    expect(dayStatus(d, DAYS[28]).canComplete).toBe(true);

    fillDay(d, 30, { skipBoss: true });
    expect(dayStatus(d, DAYS[29]).canComplete).toBe(false);
    fillBoss(d, 4);
    expect(dayStatus(d, DAYS[29]).canComplete).toBe(true);
  });

  it('accepts a dated written plan in place of a ticked acceptance item', () => {
    const d = emptyProgress();
    fillBoss(d, 4);
    setItem(d, bossKey(4, 'acc.0.0'), { done: false, text: 'Scheduled for 14 Dec: fresh clone test.' });
    expect(bossProgress(getBoss(4)!, d).status).toBe('passed');
    setItem(d, bossKey(4, 'acc.0.0'), { done: false, text: '' });
    expect(bossProgress(getBoss(4)!, d).status).toBe('in-progress');
  });
});

describe('levels, weeks, skills and achievements', () => {
  it('reports level progress from completed days', () => {
    const d = emptyProgress();
    for (let n = 1; n <= 3; n++) complete(d, n);
    const lp = levelProgress(d, 1);
    expect(lp).toMatchObject({ done: 3, total: 7, xp: 300, maxXp: 700, complete: false });
  });

  it('reports weekly xp, minutes and planned hours', () => {
    const d = emptyProgress();
    complete(d, 1);
    const w = weekProgress(d, 1);
    expect(w).toMatchObject({ done: 1, total: 7, xp: 100, plannedHours: 41, minutes: 360 });
    expect(weekProgress(d, 5).days).toEqual([29, 30]);
  });

  it('separates task completion from independently demonstrated skills', () => {
    const d = emptyProgress();
    // Complete Day 5 with every item except the AI-free ones.
    const day = DAYS[4];
    for (const s of slotsOf(day)) if (!s.aiFree) setItem(d, itemKey(5, s.key), { done: true, text });
    const agents = skillProgress(d).find((s) => s.id === 'agents')!;
    expect(agents.taskPercent).toBeGreaterThan(0);
    expect(agents.demonstratedDone).toBe(0);
    for (const s of slotsOf(day)) if (s.aiFree) setItem(d, itemKey(5, s.key), { done: true, text });
    expect(skillProgress(d).find((s) => s.id === 'agents')!.demonstratedDone).toBeGreaterThan(0);
  });

  it('unlocks achievements from completed deliverables only', () => {
    const d = emptyProgress();
    complete(d, 1);
    expect(unlockedAchievementIds(d)).toEqual(['first-llm-api-integration']);
    fillDay(d, 7); // work done but day not marked complete
    expect(unlockedAchievementIds(d)).toContain('boss-1-the-foundation');
    expect(unlockedAchievementIds(d)).not.toContain('retrieval-engineer');
    complete(d, 7);
    expect(unlockedAchievementIds(d)).toContain('retrieval-engineer');
  });

  it('points at the next boss fight as the next milestone', () => {
    const d = emptyProgress();
    expect(nextMilestone(d)).toMatchObject({ day: 7 });
    fillBoss(d, 1);
    expect(nextMilestone(d)).toMatchObject({ day: 14 });
  });

  it('computes a non-punitive rhythm without penalising gaps', () => {
    const d = emptyProgress();
    const day = (offset: number) => now - offset * 86_400_000;
    setItem(d, itemKey(1, 'learn.1'), { done: true, updatedAt: day(0) });
    setItem(d, itemKey(1, 'learn.2'), { done: true, updatedAt: day(1) });
    setItem(d, itemKey(1, 'learn.3'), { done: true, updatedAt: day(5) }); // a gap
    const s = streakInfo(d, now);
    expect(s.studyDays).toBe(3);
    expect(s.streak).toBe(2);
  });
});
