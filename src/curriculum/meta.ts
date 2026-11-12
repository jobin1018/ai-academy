/**
 * App-defined metadata layered on top of the imported curriculum. None of this changes what the
 * roadmap asks you to do: it only groups days for display (skills, library categories) and records
 * the ambiguities found while importing. Everything here is deliberately small and reviewable.
 */

export const XP = { learn: 20, design: 20, build: 35, test: 15, wrap: 10 } as const;
export type XpBucket = keyof typeof XP;
export const XP_PER_DAY = 100;
export const XP_TOTAL = 3000;

export const BUCKET_LABEL: Record<XpBucket, string> = {
  learn: 'Learn',
  design: 'Understand & design',
  build: 'Build',
  test: 'Test & prove',
  wrap: 'Challenge & debrief',
};

/** Skill areas shown on the dashboard. Days are mapped from the topic of each day's mission. */
export const SKILLS = [
  { id: 'llm', name: 'LLM engineering', blurb: 'Tokens, attention, API behaviour, structured outputs, cost and latency.', days: [1, 2, 10, 18, 19] },
  { id: 'rag', name: 'RAG and retrieval', blurb: 'Chunking, embeddings, BM25, hybrid search, Recall@5 and MRR.', days: [6, 7, 8, 17] },
  { id: 'agents', name: 'Agent orchestration', blurb: 'Tools, the agent loop, LangGraph, checkpoints, approvals, abstention.', days: [4, 5, 11, 12, 13] },
  { id: 'evals', name: 'AI evaluation', blurb: 'Ground truth, scorers, datasets, statistics, error analysis, judges.', days: [3, 9, 13, 14, 15, 16, 17, 21, 22] },
  { id: 'security', name: 'AI security', blurb: 'Excessive agency, prompt injection, least privilege, spend caps.', days: [12, 20, 23] },
  { id: 'prod', name: 'Production AI engineering', blurb: 'Cost control, tracing, CI gates, deployment, documentation.', days: [10, 18, 19, 21, 22, 23, 24, 25] },
  { id: 'interview', name: 'Interview readiness', blurb: 'Mocks, system design, live coding, positioning, applications.', days: [14, 22, 26, 27, 28, 29, 30] },
] as const;
export type SkillId = (typeof SKILLS)[number]['id'];

/** Library categories. Each resource id from Roadmap V2.1 is assigned to exactly one category. */
export const CATEGORIES = [
  { id: 'llm', name: 'LLM fundamentals', ids: ['R1', 'R2a', 'R2b', 'R3'] },
  { id: 'api', name: 'Model APIs and tool calling', ids: ['R4', 'R4-old', 'R5a', 'R5b', 'R5c', 'R5d', 'R5e', 'R5f', 'R5g'] },
  { id: 'rag', name: 'RAG', ids: ['R9', 'R10'] },
  { id: 'agents', name: 'Agents', ids: ['R6', 'R7', 'R8', 'R15'] },
  { id: 'evals', name: 'Evaluation', ids: ['R11', 'R13'] },
  { id: 'security', name: 'AI security', ids: ['R16', 'R17'] },
  { id: 'obs', name: 'Observability', ids: ['R18'] },
  { id: 'design', name: 'AI system design', ids: ['R12', 'R14'] },
  { id: 'interview', name: 'Interview preparation', ids: [] as string[] },
] as const;

export const FLAG_LABEL: Record<string, { label: string; tone: 'warn' | 'info' | 'danger'; hint: string }> = {
  replaced: { label: 'Replaced', tone: 'danger', hint: 'Roadmap V2.1 replaced this resource. Do not use it.' },
  'partly-dated': { label: 'Partly dated', tone: 'warn', hint: 'Use with the caveat stated in the status note.' },
  'unverified-link': { label: 'Confirm link', tone: 'warn', hint: 'The source marks this URL as taken from citations: open it and confirm it on first use.' },
  'check-newer-edition': { label: 'Check for newer edition', tone: 'warn', hint: 'A newer edition may exist. The source says to check on the first day you use it.' },
  'spec-in-development': { label: 'Spec in development', tone: 'info', hint: 'Attribute names may change: record the version you follow.' },
  'missing-link': { label: 'No link', tone: 'danger', hint: 'The sources provide no link for this resource.' },
};

/**
 * Open points found while importing the sources. These are surfaced in Settings so nothing is
 * silently decided on your behalf.
 */
export const AMBIGUITIES: { id: string; title: string; detail: string; resolution: string }[] = [
  {
    id: 'boss-4-day',
    title: 'Where Boss Fight 4 sits',
    detail:
      'The brief places the fourth boss fight on Day 30. The playbook (section 10) assigns it to Days 29–30: Mock 5 is Day 29, the final acceptance criteria close on Day 30.',
    resolution: 'Playbook wins. Boss Fight 4 opens from both days; Day 29 requires the Mock 5 task, and Day 30 can only complete once the whole fight passes.',
  },
  {
    id: 'task-estimates',
    title: 'No per-task time estimates',
    detail: 'The playbook gives a timetable per day (blocks such as "Build 2:00–4:30") but no duration per build task.',
    resolution: 'The Build step shows the timetable blocks for the day instead of inventing per-task estimates.',
  },
  {
    id: 'challenge-hints',
    title: 'No per-challenge hints',
    detail: 'Challenges have no hints in the source. The playbook has a per-day "IF STUCK" recovery path.',
    resolution: 'The challenge step offers the day\'s IF STUCK text as its hint, labelled as such. No hints were invented.',
  },
  {
    id: 'learn-hours-v21',
    title: 'Learning hours: timetable vs V2.1 table',
    detail: 'Where the playbook timetable and the V2.1 "total / learn" columns could differ, only the V2.1 total is authoritative for focused hours.',
    resolution: 'All 30 daily totals and learn hours matched. The importer would record any mismatch in the integrity report.',
  },
  {
    id: 'r5g-urls',
    title: 'Pricing and Effort URLs (R5g)',
    detail: 'V2.1 states these URLs were taken from citations in third-party write-ups and must be opened on Day 1 to confirm.',
    resolution: 'Flagged "Confirm link" in the library and on the Day 1 / Day 18 resource cards.',
  },
  {
    id: 'r17-edition',
    title: 'OWASP LLM Top 10 edition (R17)',
    detail: 'V2.1 notes a possible 2026 edition that was not verified. The playbook says to check on Day 12 before reading.',
    resolution: 'Flagged "Check for newer edition". The link is the 2025 page exactly as given in the source.',
  },
  {
    id: 'youtube-embeds',
    title: 'Embedded video availability',
    detail: 'The sources do not say whether each YouTube video allows embedding.',
    resolution: 'Videos embed on demand (privacy-enhanced player). If a video refuses to play, use the always-visible Open on YouTube button.',
  },
  {
    id: 'interview-library',
    title: 'Interview preparation resources',
    detail: 'Roadmap V2.1 lists no external interview-prep resources. Interview material is your own INTERVIEW_PREP.md plus the mocks.',
    resolution: 'The category exists and shows an honest empty state instead of adding unvetted material.',
  },
];

export const SELF_ASSESSMENT = [
  { value: 1, label: 'Needs another pass' },
  { value: 2, label: 'Solid, with gaps' },
  { value: 3, label: 'Could teach it' },
] as const;
