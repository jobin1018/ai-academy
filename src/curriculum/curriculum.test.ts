import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import raw from './data/curriculum.generated.json';
import { curriculum as schema } from './schema';
import { BOSS_FIGHTS, DAYS, LEVELS, RESOURCES, bossForDay, curriculum } from './index';
import { CATEGORIES, XP, XP_PER_DAY, XP_TOTAL } from './meta';
import { slotsOf } from '@/domain/progress';

const ROOT = path.resolve(__dirname, '../..');
const playbook = fs.readFileSync(path.join(ROOT, 'AI_ENGINEER_QUEST_30_DAY_PLAYBOOK.md'), 'utf8').replace(/\r\n/g, '\n');

/** Source text of one day in the playbook (between its "## DAY n" heading and the next heading). */
function sourceOfDay(n: number): string {
  const re = new RegExp(`^## DAY ${n} — .*$`, 'm');
  const start = playbook.search(re);
  const rest = playbook.slice(start + 1);
  const m = rest.search(/^(## DAY \d+ —|# LEVEL|## 10\.)/m);
  return playbook.slice(start, m < 0 ? undefined : start + 1 + m);
}
function mission(src: string, n: number | 'C'): string {
  const head = n === 'C' ? /^### MISSION COMPLETE/m : new RegExp(`^### MISSION ${n} —`, 'm');
  const s = src.search(head);
  if (s < 0) return '';
  const rest = src.slice(s + 4);
  const e = rest.search(/^### /m);
  return e < 0 ? src.slice(s) : src.slice(s, s + 4 + e);
}

describe('curriculum import', () => {
  it('validates against the typed schema', () => {
    const res = schema.safeParse(raw);
    if (!res.success) throw new Error(JSON.stringify(res.error.issues.slice(0, 5), null, 2));
    expect(res.success).toBe(true);
  });

  it('records no importer errors', () => {
    expect(curriculum.meta.importReport.errors).toEqual([]);
  });

  it('contains exactly 30 consecutive days', () => {
    expect(DAYS).toHaveLength(30);
    expect(DAYS.map((d) => d.day)).toEqual(Array.from({ length: 30 }, (_, i) => i + 1));
  });

  it('has the four levels with the documented day ranges', () => {
    expect(LEVELS.map((l) => [l.firstDay, l.lastDay])).toEqual([[1, 7], [8, 14], [15, 21], [22, 30]]);
    expect(LEVELS.map((l) => l.plannedHours)).toEqual([41, 42, 42, 54]);
    for (const d of DAYS) {
      const lv = LEVELS.find((l) => d.day >= l.firstDay && d.day <= l.lastDay)!;
      expect(d.level).toBe(lv.id);
    }
  });

  it('plans exactly 179 focused hours, matching the canonical roadmap', () => {
    expect(DAYS.reduce((a, d) => a + d.plannedHours, 0)).toBe(179);
    expect(DAYS.find((d) => d.day === 7)!.plannedHours).toBe(5);
    expect(DAYS.filter((d) => d.day !== 7).every((d) => d.plannedHours === 6)).toBe(true);
    for (const l of LEVELS) {
      expect(DAYS.filter((d) => d.level === l.id).reduce((a, d) => a + d.plannedHours, 0)).toBe(l.plannedHours);
    }
  });

  it('agrees with the V2/V2.1 hour tables (no hour conflicts left unresolved)', () => {
    const hourConflicts = curriculum.meta.conflicts.filter((c) => c.field === 'plannedHours');
    expect(hourConflicts).toEqual([]);
  });

  it('has timetables whose blocks add up to the daily hours', () => {
    for (const d of DAYS) {
      const sum = d.timetable.reduce((a, r) => a + r.minutes, 0);
      expect(sum, `day ${d.day}`).toBe(d.plannedHours * 60);
    }
  });

  it('gives every day all mandatory sections', () => {
    for (const d of DAYS) {
      const tag = `day ${d.day}`;
      expect(d.title, tag).toBeTruthy();
      expect(d.objective, tag).toBeTruthy();
      expect(d.unlock, tag).toBeTruthy();
      expect(d.difficulty, tag).toBeTruthy();
      expect(d.learn.items.length, tag).toBeGreaterThan(0);
      expect(d.design.blocks.length, tag).toBeGreaterThan(0);
      expect(d.build.tasks.some((t) => !t.optional), tag).toBe(true);
      expect(d.test.items.length, tag).toBeGreaterThan(0);
      expect(d.challenge.kind === 'boss' || d.challenge.markdown.length > 10, tag).toBe(true);
      expect(d.debrief.questions, tag).toHaveLength(3);
      expect(d.priorities.mustFinish, tag).toBeTruthy();
      expect(d.passedWhen, tag).toBeTruthy();
      if (d.day < 30) expect(d.nextUnlock, tag).toBeTruthy();
    }
  });

  it('resolves every resource reference to the library', () => {
    const ids = new Set(RESOURCES.map((r) => r.id));
    for (const d of DAYS) for (const it of d.learn.items) for (const id of it.resourceIds) expect(ids.has(id), `day ${d.day} ${id}`).toBe(true);
    expect(RESOURCES).toHaveLength(26); // R1..R18 incl. R2a/b, R5a-g and the replaced R4-old
  });

  it('gives every day a customised checklist with unique keys', () => {
    for (const d of DAYS) {
      const slots = slotsOf(d);
      const keys = slots.map((s) => s.key + '|' + s.step);
      expect(new Set(keys).size, `day ${d.day}`).toBe(keys.length);
      expect(slots.filter((s) => s.mandatory).length, `day ${d.day}`).toBeGreaterThanOrEqual(10);
    }
  });

  it('has the four weekly boss fights wired to the right days', () => {
    expect(BOSS_FIGHTS.map((b) => b.id)).toEqual([1, 2, 3, 4]);
    for (const [day, id] of [[7, 1], [14, 2], [21, 3], [29, 4]] as const) {
      expect(DAYS[day - 1].bossFightId).toBe(id);
      expect(bossForDay(day)?.id).toBe(id);
    }
    expect(bossForDay(30)?.id).toBe(4); // Boss Fight 4 spans Days 29–30
    expect(BOSS_FIGHTS.map((b) => b.tasks.length)).toEqual([5, 7, 6, 5]);
    for (const b of BOSS_FIGHTS) {
      expect(b.passWhen).toBeTruthy();
      expect(b.ifYouFail).toBeTruthy();
    }
    expect(BOSS_FIGHTS[2].tasks.find((t) => t.cuttable)?.id).toBe(5);
  });

  it('keeps the transparent XP model: 20/20/35/15/10 per day, 3000 in total', () => {
    expect(Object.values(XP).reduce((a, b) => a + b, 0)).toBe(XP_PER_DAY);
    expect(XP_PER_DAY * DAYS.length).toBe(XP_TOTAL);
    expect(curriculum.xpModel.map((r) => r.xp)).toEqual([20, 20, 35, 15, 10]);
    for (const d of DAYS) {
      const buckets = new Set(slotsOf(d).filter((s) => s.bucket).map((s) => s.bucket));
      expect([...buckets].sort()).toEqual(['build', 'design', 'learn', 'test', 'wrap']);
    }
  });
});

describe('no essential task has silently disappeared', () => {
  it('keeps every build task heading of the playbook', () => {
    for (const d of DAYS) {
      const m3 = mission(sourceOfDay(d.day), 3);
      const headings = [...m3.matchAll(/^\*\*Task (\d+\.\d+) — /gm)].map((m) => m[1]);
      if (headings.length) expect(d.build.tasks.map((t) => t.id), `day ${d.day}`).toEqual(headings);
      else expect(d.build.tasks.length, `day ${d.day}`).toBeGreaterThan(0);
    }
  });

  it('keeps every line of the playbook "Mission complete" checklist', () => {
    for (const d of DAYS) {
      const lines = [...mission(sourceOfDay(d.day), 'C').matchAll(/^- \[ \] (.+)$/gm)].map((m) => m[1]);
      expect(d.sourceChecklist, `day ${d.day}`).toEqual(lines);
    }
  });

  it('keeps every Claude Code prompt (fenced block) of each day', () => {
    for (const d of DAYS) {
      const fences = (sourceOfDay(d.day).match(/^```/gm) ?? []).length / 2;
      const prompts = d.build.tasks.reduce((a, t) => a + t.prompts.length, 0);
      expect(prompts, `day ${d.day}`).toBe(fences);
    }
  });

  it('keeps every URL of the learning mission, with identical addresses', () => {
    for (const d of DAYS) {
      const urls = [...mission(sourceOfDay(d.day), 1).matchAll(/\]\((https?:\/\/[^)\s]+)\)/g)].map((m) => m[1]);
      const have = new Set(d.learn.items.flatMap((i) => i.links.map((l) => l.url)));
      for (const u of urls) expect(have.has(u), `day ${d.day} ${u}`).toBe(true);
    }
  });

  it('keeps every interview question and every verification item', () => {
    for (const d of DAYS) {
      const src = sourceOfDay(d.day);
      const m6 = src.slice(src.search(/^### MISSION (6|5 — BOSS)/m));
      const qs = [...m6.split(/^\*\*MUST FINISH/m)[0].matchAll(/^\d+\. (.+)$/gm)].map((m) => m[1]);
      expect(d.debrief.questions, `day ${d.day}`).toEqual(qs);
    }
  });

  it('never rewrites URLs: every learn link exists in a source document or is flagged', () => {
    const sources = ['Roadmap V2 — Audit and Final Plan.md', 'Roadmap V2.1 — Execution Ready.md'].map((f) => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n');
    for (const d of DAYS) {
      for (const it of d.learn.items) {
        for (const l of it.links) {
          if (!sources.includes(l.url)) expect(l.unverified, `day ${d.day} ${l.url}`).toBe(true);
        }
      }
    }
  });

  it('preserves the Day 1 pre-work and the final acceptance checklists', () => {
    expect(curriculum.prework.items).toHaveLength(4);
    expect(curriculum.acceptanceChecklist.flatMap((g) => g.items)).toHaveLength(16);
    expect(curriculum.portfolioChecklist.flatMap((g) => g.items)).toHaveLength(15);
  });
});

describe('resource library', () => {
  it('assigns every resource to exactly one category', () => {
    const assigned = CATEGORIES.flatMap((c) => c.ids as readonly string[]);
    expect(new Set(assigned).size).toBe(assigned.length);
    expect([...assigned].sort()).toEqual(RESOURCES.map((r) => r.id).sort());
  });

  it('flags resources that need attention instead of inventing links', () => {
    const flags = (id: string) => RESOURCES.find((r) => r.id === id)!.flags;
    expect(flags('R4-old')).toContain('replaced');
    expect(flags('R5g')).toContain('unverified-link');
    expect(flags('R17')).toContain('check-newer-edition');
    expect(flags('R6')).toContain('partly-dated');
    expect(flags('R18')).toContain('spec-in-development');
    for (const r of RESOURCES) expect(r.links.length, r.id).toBeGreaterThan(0);
  });

  it('marks the paid book as paid and everything else as free', () => {
    expect(RESOURCES.filter((r) => r.cost === 'paid').map((r) => r.id)).toEqual(['R12']);
  });
});
