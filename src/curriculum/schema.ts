import { z } from 'zod';

/**
 * Typed shape of src/curriculum/data/curriculum.generated.json, which scripts/import-curriculum.mjs
 * produces from the three source documents. The same schema validates the file in tests, so the
 * types and the runtime check cannot drift apart.
 */

const link = z.object({ label: z.string(), url: z.url(), unverified: z.boolean().optional() });

export const learnItem = z.object({
  index: z.number().int(),
  title: z.string().min(1),
  resourceIds: z.array(z.string()),
  isAlternative: z.boolean(),
  minutes: z.number().nullable(),
  keyConcepts: z.string(),
  checks: z.array(z.string()),
  bodyMarkdown: z.string(),
  sourceMarkdown: z.string(),
  links: z.array(link),
});

const designBlock = z.object({
  kind: z.enum(['what-and-why', 'concepts', 'decisions', 'pitfalls', 'exercise', 'other']),
  label: z.string(),
  markdown: z.string(),
});

export const taskLabel = z.enum(['ai-free-task', 'claude-code-allowed', 'design-review']);

export const buildTask = z.object({
  id: z.string(),
  title: z.string().min(1),
  labels: z.array(taskLabel),
  files: z.array(z.string()),
  description: z.string(),
  acceptance: z.array(z.object({ kind: z.string(), text: z.string() })),
  prompts: z.array(z.string()),
  commands: z.array(z.string()),
  optional: z.boolean(),
  sourceMarkdown: z.string(),
});

const timetableRow = z.object({
  time: z.string(),
  start: z.number(),
  end: z.number(),
  minutes: z.number().positive(),
  activity: z.string(),
  output: z.string(),
});

const priorities = z.object({
  mustFinish: z.string().optional(),
  ifTimeRemains: z.string().optional(),
  ifStuck: z.string().optional(),
  carryForward: z.string().optional(),
});

export const day = z.object({
  day: z.number().int().min(1).max(30),
  level: z.number().int().min(1).max(4),
  title: z.string().min(1),
  bossFightId: z.number().int().nullable(),
  dateLabel: z.string(),
  isoDate: z.string(),
  objective: z.string().min(1),
  prerequisites: z.string(),
  unlock: z.string().min(1),
  plannedHours: z.number().positive(),
  learnHours: z.number().min(0),
  difficulty: z.string().min(1),
  timetable: z.array(timetableRow).min(3),
  learn: z.object({ intro: z.string(), items: z.array(learnItem).min(1), headingXp: z.number() }),
  design: z.object({ blocks: z.array(designBlock).min(1), designReview: z.boolean(), aiFree: z.boolean() }),
  build: z.object({ intro: z.string(), tasks: z.array(buildTask).min(1), headerSuffix: z.string() }),
  test: z.object({ intro: z.string(), items: z.array(z.string()).min(1), evidence: z.string() }),
  challenge: z.object({
    kind: z.enum(['challenge', 'boss']),
    bossFightId: z.number().optional(),
    title: z.string(),
    markdown: z.string(),
    aiFree: z.boolean(),
  }),
  debrief: z.object({
    questions: z.array(z.string()).length(3),
    aiFree: z.boolean(),
    recall: z.string(),
    explain: z.string(),
    log: z.string(),
    revisit: z.string(),
  }),
  priorities,
  sourceChecklist: z.array(z.string()).min(1),
  passedWhen: z.string().min(1),
  achievementText: z.string(),
  nextUnlock: z.string(),
  sourceHash: z.string(),
});

export const resource = z.object({
  id: z.string(),
  title: z.string(),
  creator: z.string(),
  cost: z.enum(['free', 'paid']),
  costNote: z.string(),
  lengthText: z.string(),
  minutes: z.number().nullable(),
  links: z.array(link),
  useExactly: z.string(),
  useLinks: z.array(link),
  days: z.array(z.number()),
  usedInLearnDays: z.array(z.number()),
  allDays: z.array(z.number()),
  status: z.string(),
  flags: z.array(
    z.enum(['replaced', 'partly-dated', 'unverified-link', 'check-newer-edition', 'spec-in-development', 'missing-link']),
  ),
});

export const bossFight = z.object({
  id: z.number().int(),
  name: z.string(),
  whenText: z.string(),
  days: z.array(z.number()),
  scenario: z.string(),
  tasks: z.array(z.object({ id: z.number(), text: z.string(), cuttable: z.boolean() })).min(1),
  restrictions: z.string().optional(),
  evidence: z.string().optional(),
  passWhen: z.string(),
  ifYouFail: z.string(),
});

export const curriculum = z.object({
  meta: z.object({
    title: z.string(),
    project: z.string(),
    window: z.string(),
    totalHours: z.number(),
    totalXp: z.number(),
    sources: z.record(z.string(), z.object({ file: z.string(), sha256: z.string() })),
    precedence: z.array(z.string()),
    conflicts: z.array(z.record(z.string(), z.unknown())),
    importReport: z.object({ warnings: z.array(z.string()), errors: z.array(z.string()) }),
    learningLogTemplate: z.string(),
    guide: z.array(z.object({ title: z.string(), markdown: z.string() })),
  }),
  levels: z.array(
    z.object({
      id: z.number(),
      name: z.string(),
      title: z.string(),
      firstDay: z.number(),
      lastDay: z.number(),
      plannedHours: z.number(),
      tagline: z.string(),
      finishWith: z.string(),
    }),
  ),
  xpModel: z.array(z.object({ mission: z.string(), xp: z.number(), earnedOnlyWhen: z.string() })),
  prework: z.object({ title: z.string(), items: z.array(z.string()) }),
  days: z.array(day),
  resources: z.array(resource),
  bossFights: z.array(bossFight),
  acceptanceChecklist: z.array(z.object({ title: z.string(), items: z.array(z.string()) })),
  portfolioChecklist: z.array(z.object({ title: z.string(), items: z.array(z.string()) })),
  achievements: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      days: z.array(z.number()),
      bossFightId: z.number().nullable(),
      evidence: z.string(),
    }),
  ),
});

export type Curriculum = z.infer<typeof curriculum>;
export type Day = z.infer<typeof day>;
export type LearnItem = z.infer<typeof learnItem>;
export type BuildTask = z.infer<typeof buildTask>;
export type Resource = z.infer<typeof resource>;
export type BossFight = z.infer<typeof bossFight>;
export type Level = Curriculum['levels'][number];
export type Achievement = Curriculum['achievements'][number];
export type TaskLabel = z.infer<typeof taskLabel>;
