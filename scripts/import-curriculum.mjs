#!/usr/bin/env node
/**
 * Curriculum importer.
 *
 * Parses the three source documents into one typed, version-controlled JSON file
 * (src/curriculum/data/curriculum.generated.json). Nothing is hand-copied or summarised:
 * every field comes from the Markdown. Source precedence:
 *   1. Roadmap V2.1 (corrected instructions, resource index R1-R18, canonical hours)
 *   2. Roadmap V2   (unchanged specifications, creators)
 *   3. The 30-day playbook (step-by-step missions)
 *
 * Disagreements between sources are recorded in meta.conflicts (resolved by precedence).
 * Structural problems are recorded in meta.importReport.errors and make the script exit 1.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILES = {
  playbook: 'AI_ENGINEER_QUEST_30_DAY_PLAYBOOK.md',
  v2: 'Roadmap V2 — Audit and Final Plan.md',
  v21: 'Roadmap V2.1 — Execution Ready.md',
};
const OUT = path.join(ROOT, 'src/curriculum/data/curriculum.generated.json');

const errors = [];
const warnings = [];
const conflicts = [];
const err = (m) => errors.push(m);
const warn = (m) => warnings.push(m);

const read = (f) => {
  const p = path.join(ROOT, f);
  if (!fs.existsSync(p)) {
    err(`Missing source file: ${f}`);
    return '';
  }
  return fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
};
const raw = { playbook: read(FILES.playbook), v2: read(FILES.v2), v21: read(FILES.v21) };
if (errors.length) fail();

// ---------- generic helpers ----------
const unesc = (s) => s.replace(/\\([_\[\]*|#()<>~`-])/g, '$1');
const stripMd = (s) =>
  unesc(s)
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*`]/g, '')
    .trim();
const LINK_RE = /\[((?:[^\[\]\\]|\\.)+?)\]\((https?:\/\/[^)\s]+)\)/g;
const links = (s) => [...s.matchAll(LINK_RE)].map((m) => ({ label: stripMd(m[1]), url: m[2] }));
const num = (s) => Number.parseFloat(s);
const dedent = (lines) => {
  const ind = Math.min(...lines.filter((l) => l.trim()).map((l) => l.match(/^ */)[0].length), 99);
  return lines.map((l) => (ind === 99 ? l : l.slice(Math.min(ind, l.match(/^ */)[0].length)))).join('\n');
};
const trimBlank = (lines) => {
  let a = 0;
  let b = lines.length;
  while (a < b && !lines[a].trim()) a++;
  while (b > a && !lines[b - 1].trim()) b--;
  return lines.slice(a, b);
};
const splitRow = (line) =>
  line
    .replace(/^\s*\|/, '')
    .replace(/\|\s*$/, '')
    .split(/(?<!\\)\|/)
    .map((c) => c.trim());
const tableRows = (lines) =>
  lines
    .filter((l) => l.trim().startsWith('|'))
    .map(splitRow)
    .filter((r) => !r.every((c) => /^:?-{2,}:?$/.test(c)));
const minutesOf = (t) => {
  const m = t.match(/^(\d+):(\d+)$/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : NaN;
};
const hash = (s) => crypto.createHash('sha256').update(s).digest('hex');

function fail() {
  console.error(errors.map((e) => `ERROR: ${e}`).join('\n'));
  process.exit(1);
}

// ---------- canonical hours (V2 table, overridden by V2.1 section 3) ----------
function parseCanonicalHours() {
  const canon = {};
  const grab = (text, source) => {
    for (const line of text.split('\n')) {
      const m = line.match(/^\|\s*\*{0,2}(\d{1,2})\*{0,2}\s*\|\s*(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)\s*\|/);
      if (m) canon[Number(m[1])] = { hours: num(m[2]), learn: num(m[3]), source };
    }
  };
  // V2 section D table and V2.1 section 3 table share the "| Day | Hrs" shape.
  grab(raw.v2.slice(raw.v2.indexOf('## D. 30-day execution plan')), 'v2');
  grab(raw.v21.slice(raw.v21.indexOf('## 3. Updated schedule')), 'v2.1');
  return canon;
}
const canonHours = parseCanonicalHours();

// ---------- resources ----------
function parseV21Resources() {
  const start = raw.v21.indexOf('## 4. Learning-resource index');
  const end = raw.v21.indexOf('**Removed from use:**');
  const rows = tableRows(raw.v21.slice(start, end).split('\n'));
  const out = [];
  for (const r of rows) {
    if (r.length < 7 || r[0] === 'ID') continue;
    const [id, res, cost, length, useExactly, days, status] = r;
    out.push({ id: unesc(id), res, cost, length, useExactly, days, status });
  }
  return out;
}
function parsePlaybookResourceCreators() {
  const start = raw.playbook.indexOf('## 5. Learning resource library');
  const end = raw.playbook.indexOf('**Not in the verified library:**');
  const rows = tableRows(raw.playbook.slice(start, end).split('\n'));
  const map = {};
  for (const r of rows) {
    if (r[0] === 'ID' || r.length < 6) continue;
    const m = r[1].match(/^(.+?) — \[/);
    if (m) map[r[0]] = stripMd(m[1]);
  }
  return map;
}
function parseV2Creators() {
  const start = raw.v2.indexOf('**The library**');
  const end = raw.v2.indexOf('**Not recommended for this plan:**');
  const rows = tableRows(raw.v2.slice(start, end).split('\n'));
  const map = {};
  for (const r of rows) {
    if (r[0] === 'ID' || r.length < 7) continue;
    map[r[0]] = stripMd(r[2]);
  }
  return map;
}
function lengthToMinutes(text) {
  if (!text) return null;
  const t = text.replace(/about|used|video|,.*$/gi, ' ');
  let total = 0;
  let found = false;
  for (const m of t.matchAll(/(\d+(?:\.\d+)?)\s*h\b/g)) {
    total += num(m[1]) * 60;
    found = true;
  }
  for (const m of t.matchAll(/(\d+(?:\.\d+)?)\s*min/g)) {
    total += num(m[1]);
    found = true;
  }
  return found ? Math.round(total) : null;
}
function buildResources() {
  const v21 = parseV21Resources();
  const pbCreators = parsePlaybookResourceCreators();
  const v2Creators = parseV2Creators();
  const resources = v21.map((r) => {
    const all = links(r.res);
    const titleLinks = all.filter((l) => !/^lesson page$/i.test(l.label));
    const labels = titleLinks.map((l) => l.label);
    const title =
      labels.length === 0
        ? stripMd(r.res)
        : labels.length <= 2
          ? labels.join(' + ')
          : `${labels[0]} + ${labels.length - 1} more`;
    const base = r.id.replace(/-old$/, '').replace(/[a-z]$/, '');
    const creator = pbCreators[r.id] ?? v2Creators[base] ?? stripMd(r.res.split('[')[0]).replace(/[,—-]\s*$/, '') ?? '';
    const paid = /\*\*Paid\*\*|^Paid/i.test(r.cost);
    const status = unesc(r.status);
    const flags = [];
    if (/Replaced/i.test(status)) flags.push('replaced');
    if (/Partly dated/i.test(status)) flags.push('partly-dated');
    if (/open them on Day 1 to confirm|Confirm on Day 1|not verified here/i.test(status)) flags.push('unverified-link');
    if (/newer edition|2026 edition/i.test(status)) flags.push('check-newer-edition');
    if (/Development/i.test(status)) flags.push('spec-in-development');
    if (all.length === 0) flags.push('missing-link');
    const days = [...unesc(r.days).replace(/\([^)]*\)/g, '').matchAll(/\d+/g)].map((m) => Number(m[0]));
    return {
      id: r.id,
      title,
      creator: creator || 'Unknown',
      cost: paid ? 'paid' : 'free',
      costNote: stripMd(r.cost),
      lengthText: stripMd(r.length),
      minutes: lengthToMinutes(stripMd(r.length)),
      links: all,
      useExactly: unesc(r.useExactly),
      useLinks: links(r.useExactly),
      days: r.id.endsWith('-old') ? [] : days,
      status,
      flags,
    };
  });
  return resources;
}

// ---------- boss fights, checklists, tables from the playbook ----------
const pbLines = raw.playbook.split('\n');

function sectionBetween(startRe, endRe, from = 0) {
  const s = pbLines.findIndex((l, i) => i >= from && startRe.test(l));
  if (s < 0) return null;
  let e = pbLines.findIndex((l, i) => i > s && endRe.test(l));
  if (e < 0) e = pbLines.length;
  return { start: s, end: e, lines: pbLines.slice(s, e) };
}

function parseBossFights() {
  const sec = sectionBetween(/^## 10\. Weekly boss fights/, /^## 11\./);
  if (!sec) {
    err('Boss fight section (## 10) not found');
    return [];
  }
  const bosses = [];
  let cur = null;
  let field = null;
  for (const line of sec.lines) {
    const h = line.match(/^### BOSS FIGHT (\d) — (.+?) \((Days? [\d–]+)\)\s*$/);
    if (h) {
      cur = { id: Number(h[1]), name: h[2], whenText: h[3], days: [...h[3].matchAll(/\d+/g)].map((m) => Number(m[0])) };
      if (cur.days.length === 2 && cur.days[1] - cur.days[0] === 1) {
        /* Days 29–30 */
      }
      cur.tasks = [];
      bosses.push(cur);
      field = null;
      continue;
    }
    if (!cur) continue;
    const f = line.match(/^\*\*(Scenario|Tasks|Restrictions|Evidence|Pass when|If you fail):\*\*\s*(.*)$/);
    if (f) {
      field = f[1];
      const val = f[2];
      if (field === 'Scenario') cur.scenario = val;
      else if (field === 'Restrictions') cur.restrictions = val;
      else if (field === 'Evidence') cur.evidence = val;
      else if (field === 'Pass when') cur.passWhen = val;
      else if (field === 'If you fail') cur.ifYouFail = val;
      continue;
    }
    const t = line.match(/^(\d+)\. (.+)$/);
    if (t && field === 'Tasks') {
      const text = t[2];
      cur.tasks.push({ id: Number(t[1]), text, cuttable: /\bor\b[^.]*\b(recorded cut|formally cut)/i.test(text) });
    }
  }
  return bosses;
}

function parseChecklistSection(startRe, endRe) {
  const sec = sectionBetween(startRe, endRe);
  if (!sec) return [];
  const groups = [];
  let cur = null;
  for (const line of sec.lines) {
    const g = line.match(/^\*\*(.+?)\*\*\s*$/);
    if (g) {
      cur = { title: g[1], items: [] };
      groups.push(cur);
      continue;
    }
    const c = line.match(/^- \[ \] (.+)$/);
    if (c && cur) cur.items.push(c[1]);
  }
  return groups;
}

function parseAchievements() {
  const sec = sectionBetween(/^\*\*Achievements \(each tied/, /^---$/);
  if (!sec) return [];
  return tableRows(sec.lines)
    .filter((r) => r[0] !== 'Achievement')
    .map((r) => {
      const boss = /^\*\*Boss/.test(r[0]);
      const name = stripMd(r[0]);
      const dayText = r[1].replace(/Day /, '');
      const days = [...dayText.matchAll(/\d+/g)].map((m) => Number(m[0]));
      const bossN = boss ? Number(name.match(/Boss (\d)/)[1]) : null;
      return { id: slug(name), name, days, bossFightId: bossN, evidence: stripMd(r[2]) };
    });
}
const slug = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

function parseXpTable() {
  const sec = sectionBetween(/^\*\*XP per day \(100 max\)\*\*/, /^\*\*Achievements/);
  if (!sec) return [];
  return tableRows(sec.lines)
    .filter((r) => r[0] !== 'Mission')
    .map((r) => ({ mission: stripMd(r[0]), xp: Number(r[1]), earnedOnlyWhen: stripMd(r[2]) }));
}

function parseLevels() {
  const levels = [];
  const overview = sectionBetween(/^\| Level \| Days \| Hours/, /^\*\*Non-negotiable/);
  const finishWith = {};
  if (overview) {
    for (const r of tableRows(overview.lines)) {
      const m = r[0].match(/LEVEL (\d)/);
      if (m) finishWith[Number(m[1])] = stripMd(r[3]);
    }
  }
  for (let i = 0; i < pbLines.length; i++) {
    const m = pbLines[i].match(/^# LEVEL (\d) — (.+?) \(Days (\d+)–(\d+) · (\d+) hours\)\s*$/);
    if (!m) continue;
    let j = i + 1;
    while (j < pbLines.length && !pbLines[j].trim()) j++;
    const tag = pbLines[j].match(/^\*(.+)\*$/);
    const n = Number(m[1]);
    levels.push({
      id: n,
      name: titleCase(m[2]),
      title: `Level ${n} — ${titleCase(m[2])}`,
      firstDay: Number(m[3]),
      lastDay: Number(m[4]),
      plannedHours: Number(m[5]),
      tagline: tag ? tag[1] : '',
      finishWith: finishWith[n] ?? '',
    });
  }
  return levels;
}
const titleCase = (s) => s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()).replace(/\bAi\b/g, 'AI');

function parsePrework() {
  const idx = pbLines.findIndex((l) => /^\*\*Before Day 1/.test(l));
  if (idx < 0) return { title: '', items: [] };
  const items = [];
  for (let i = idx + 1; i < pbLines.length && !/^---$/.test(pbLines[i]); i++) {
    const m = pbLines[i].match(/^- \[ \] (.+)$/);
    if (m) items.push(m[1]);
  }
  return { title: stripMd(pbLines[idx]), items };
}

// ---------- day parsing ----------
const LABEL_RE = /\*\*(AI-FREE TASK|CLAUDE CODE ALLOWED|DESIGN REVIEW)(?: \([^)]*\))?\*\*/g;
const COMMAND_RE = /^(uv|docker|git|pytest|python|npm|pip|make|ruff|mypy|curl)\s+\S/;

function labelsIn(text) {
  const set = new Set();
  for (const m of text.matchAll(LABEL_RE)) set.add(m[1].toLowerCase().replace(/ /g, '-'));
  return [...set];
}

function extractFences(lines) {
  const fences = [];
  const rest = [];
  let inFence = false;
  let buf = [];
  for (const l of lines) {
    if (/^\s*```/.test(l)) {
      if (inFence) {
        fences.push(buf.join('\n'));
        buf = [];
      }
      inFence = !inFence;
      continue;
    }
    if (inFence) buf.push(l);
    else rest.push(l);
  }
  return { fences, rest };
}

function inlineCommands(text, fences) {
  const out = [];
  const noFence = fences.reduce((t, f) => t.replace(f, ''), text);
  for (const m of noFence.matchAll(/`([^`\n]+)`/g)) {
    if (COMMAND_RE.test(m[1]) && !out.includes(m[1])) out.push(m[1]);
  }
  return out;
}

function parseListItems(lines) {
  const intro = [];
  const items = [];
  const trailing = [];
  let cur = null;
  let seenItem = false;
  let trailingMode = false;
  for (const l of lines) {
    if (/^(- |\d+\. )/.test(l)) {
      cur = [l.replace(/^(- |\d+\. )/, '')];
      items.push(cur);
      seenItem = true;
      trailingMode = false;
    } else if (/^\s+\S/.test(l) && cur && !trailingMode) {
      cur.push(l);
    } else if (!l.trim()) {
      if (cur && !trailingMode) cur.push('');
    } else if (!seenItem) {
      intro.push(l);
    } else {
      trailingMode = true;
      trailing.push(l);
    }
  }
  return {
    intro: trimBlank(intro).join('\n'),
    items: items.map((it) => dedentFirst(trimBlank(it))),
    trailing: trimBlank(trailing).join('\n'),
  };
}
function dedentFirst(lines) {
  if (!lines.length) return '';
  const [first, ...rest] = lines;
  return [first, ...(rest.length ? dedent(rest).split('\n') : [])].join('\n');
}

function splitItalicSegments(text) {
  // Segments introduced by a single-asterisk italic label such as "*Write:*".
  const re = /(?<!\*)\*(?!\*)([A-Z][^*\n]{1,70}?):\*(?!\*)/g;
  const marks = [...text.matchAll(re)].map((m) => ({ label: m[1], start: m.index, end: m.index + m[0].length }));
  const segs = marks.map((m, i) => ({
    label: m.label,
    start: m.start,
    contentStart: m.end,
    end: i + 1 < marks.length ? marks[i + 1].start : text.length,
  }));
  return segs.map((s) => ({ ...s, content: text.slice(s.contentStart, s.end).trim() }));
}

function questionsFrom(content) {
  const parts = content.split(/\(([a-z])\)\s+/);
  if (parts.length < 3) {
    const t = content.replace(/\s+/g, ' ').trim();
    return t ? [t] : [];
  }
  const qs = [];
  for (let i = 1; i < parts.length; i += 2) {
    const q = (parts[i + 1] ?? '').replace(/\s+/g, ' ').replace(/[;,]\s*$/, '').trim();
    if (q) qs.push(q);
  }
  return qs;
}

function parseLearn(body, timetable, dayNum) {
  const lines = trimBlank(body);
  const itemStarts = [];
  lines.forEach((l, i) => {
    if (/^\d+\.\s/.test(l) || /^\*\*Option [AB]/.test(l)) itemStarts.push(i);
  });
  let chunks;
  let intro = '';
  if (itemStarts.length) {
    intro = lines.slice(0, itemStarts[0]).join('\n').trim();
    chunks = itemStarts.map((s, i) => lines.slice(s, itemStarts[i + 1] ?? lines.length));
  } else {
    chunks = [lines];
  }
  const items = chunks.map((chunk, idx) => {
    const first = chunk[0].replace(/^\d+\.\s+/, '');
    const rest = chunk.slice(1);
    const text = trimBlank([first, ...(rest.length ? dedent(rest).split('\n') : [])]).join('\n');
    const resourceIds = [];
    for (const m of text.matchAll(/\bR(\d{1,2}[a-g]?)\b/g)) {
      const id = `R${m[1]}`;
      if (!resourceIds.includes(id)) resourceIds.push(id);
    }
    const bolds = [...first.matchAll(/\*\*(.+?)\*\*/g)].map((m) => stripMd(m[1]));
    const rBolds = bolds.filter((b) => /^R\d/.test(b));
    let title;
    if (rBolds.length) title = rBolds.map((b) => b.replace(/^(R\d+[a-z]?)\s*—\s*/, '$1 · ')).join(' + ');
    else if (bolds.length) title = bolds[0].replace(/[:：]\s*$/, '');
    else title = stripMd(first).split(/[.:]/)[0].slice(0, 90);
    const segs = splitItalicSegments(text);
    const keySeg = segs.find((s) => /^(Pay attention to|Focus)$/.test(s.label));
    const checkSegs = segs.filter((s) => /^(Afterwards, write without notes|Write|Write from memory first, then check|Questions)/.test(s.label));
    // Remove the segments rendered as dedicated UI (key concepts, knowledge check) from the body.
    let bodyMd = text;
    for (const s of [keySeg, ...checkSegs].filter(Boolean).sort((a, b) => b.start - a.start)) {
      bodyMd = bodyMd.slice(0, s.start) + bodyMd.slice(s.end);
    }
    bodyMd = bodyMd.replace(/\n{3,}/g, '\n\n').trim();
    const checks = checkSegs.flatMap((s) => questionsFrom(s.content));
    const rowMins = new Set();
    let minutes = 0;
    timetable.forEach((row, i) => {
      if (!/learn|quiz|reread|recall/i.test(row.activity)) return;
      if (resourceIds.some((rid) => new RegExp(`\\b${rid}\\b`).test(row.activity)) && !rowMins.has(i)) {
        rowMins.add(i);
        minutes += row.minutes;
      }
    });
    if (!minutes) {
      for (const m of first.matchAll(/(\d+)\s*min/g)) minutes += Number(m[1]);
    }
    const urlLinks = links(text);
    return {
      index: idx + 1,
      title,
      resourceIds,
      isAlternative: /^\*\*Option [AB]/.test(first),
      minutes: minutes || null,
      keyConcepts: keySeg ? keySeg.content.trim() : '',
      checks,
      bodyMarkdown: bodyMd,
      sourceMarkdown: text,
      links: urlLinks,
    };
  });
  return { intro, items };
}

function parseDesign(body) {
  const lines = trimBlank(body);
  const paras = [];
  let cur = [];
  for (const l of lines) {
    if (!l.trim()) {
      if (cur.length) paras.push(cur.join('\n'));
      cur = [];
    } else cur.push(l);
  }
  if (cur.length) paras.push(cur.join('\n'));
  const blocks = paras.map((p) => {
    const m = p.match(/^\*\*(.+?)\*\*\s*(.*)$/s);
    let label = '';
    let md = p;
    if (m) {
      label = m[1].replace(/[.:]\s*$/, '').trim();
      md = p;
    }
    let kind = 'other';
    if (/^what and why/i.test(label)) kind = 'what-and-why';
    else if (/^concepts/i.test(label)) kind = 'concepts';
    else if (/^decisions/i.test(label)) kind = 'decisions';
    else if (/^common mistakes/i.test(label)) kind = 'pitfalls';
    else if (/^(design exercise|design review|design\b|definitions)/i.test(label)) kind = 'exercise';
    return { kind, label, markdown: md };
  });
  if (!blocks.some((b) => b.kind === 'exercise')) {
    // No bold lead-in marks an exercise in this day: the whole section is the exercise.
    blocks.forEach((b) => {
      if (b.kind === 'other') b.kind = 'exercise';
    });
  }
  const text = body.join('\n');
  return {
    blocks,
    designReview: /DESIGN REVIEW/.test(text),
    aiFree: /AI-free/i.test(text),
  };
}

function parseBuild(body, headerSuffix, dayNum) {
  const lines = trimBlank(body);
  const taskStarts = [];
  lines.forEach((l, i) => {
    if (/^\*\*Task \d+\.\d+ — /.test(l)) taskStarts.push(i);
  });
  const mkTask = (id, title, firstRest, restLines, overrides = {}) => {
    const { fences, rest } = extractFences(restLines);
    const allText = [firstRest, ...restLines].join('\n');
    const labels = labelsIn(firstRest);
    const files = [];
    const headerPart = firstRest.split(/\s—\s/)[0];
    for (const m of headerPart.matchAll(/`([^`\n]+)`/g)) {
      if (!COMMAND_RE.test(m[1]) && /[\/.]/.test(m[1]) && !/\s/.test(m[1].trim().replace(/\s—.*/, ''))) files.push(m[1]);
    }
    const accept = [];
    const desc = [];
    for (const l of rest) {
      const a = l.match(/^\s*[-*]?\s*\*(Done when|Expected output|Verify):\*\s*(.*)$/);
      if (a) accept.push({ kind: a[1], text: a[2].trim() });
      else desc.push(l);
    }
    // `*Done when:*` may also open the first line.
    const firstAccept = firstRest.match(/\*(Done when|Expected output|Verify):\*\s*(.*)$/);
    let firstDesc = firstRest;
    if (firstAccept) {
      accept.unshift({ kind: firstAccept[1], text: firstAccept[2].trim() });
      firstDesc = firstRest.slice(0, firstAccept.index);
    }
    // The header line repeats the labels and file names shown as badges; keep only its prose.
    let headProse = firstDesc.replace(LABEL_RE, '').replace(/\s+/g, ' ');
    for (const f of files) headProse = headProse.replace(`\`${f}\``, '');
    headProse = headProse
      .replace(/^[\s·,/]+/, '')
      .replace(/\)\s*\/\s*\(/g, ') · (')
      .replace(/[\s·,/]+(?=—)/g, ' ')
      .replace(/^—\s*/, '')
      .replace(/^[\s·,/]+/, '')
      .replace(/,\s*$/, '')
      .trim();
    const description = trimBlank([headProse, ...desc]).join('\n').replace(/\n{3,}/g, '\n\n');
    return {
      id,
      title,
      labels: overrides.labels ?? labels,
      files,
      description,
      acceptance: accept,
      prompts: fences,
      commands: inlineCommands(allText, fences),
      optional: !!overrides.optional,
      sourceMarkdown: [firstRest, ...restLines].join('\n').trim(),
    };
  };

  let tasks = [];
  let intro = '';
  if (taskStarts.length) {
    intro = lines.slice(0, taskStarts[0]).join('\n').trim();
    tasks = taskStarts.map((s, i) => {
      const chunk = lines.slice(s, taskStarts[i + 1] ?? lines.length);
      const h = chunk[0].match(/^\*\*Task (\d+\.\d+) — (.+?)\*\*(.*)$/);
      if (!h) {
        err(`Day ${dayNum}: cannot parse task header: ${chunk[0].slice(0, 80)}`);
        return null;
      }
      return mkTask(h[1], stripMd(h[2]).replace(/[:：]\s*$/, ''), h[3].trim(), chunk.slice(1));
    }).filter(Boolean);
  } else {
    // Day 27-29: the build mission is free text. Split on **Part N:** markers, else on paragraphs.
    const text = lines.join('\n');
    const noClaude = /AI-FREE|no Claude|no AI\b/i.test(headerSuffix);
    const labels = noClaude ? ['ai-free-task'] : [];
    const parts = [...text.matchAll(/\*\*Part (\d):\*\*/g)];
    if (parts.length) {
      const titles = { 1: 'Part 1 — build it live', 2: 'Part 2 — project defence' };
      parts.forEach((p, i) => {
        const seg = text.slice(p.index + p[0].length, parts[i + 1]?.index ?? text.length).trim();
        tasks.push({ ...mkTask(`3.${i + 1}`, titles[p[1]] ?? `Part ${p[1]}`, seg, [], { labels }), sourceMarkdown: seg });
      });
    } else {
      const paras = text.split(/\n\s*\n|\n(?=Then |If time remains)/).map((p) => p.trim()).filter(Boolean);
      const titleByDay = { 27: ['Timed AI-free build', '5-minute architecture talk'], 29: ['Mock 5 — full interview loop', 'P2 — MCP server (only if every P0 and P1 is done)'] };
      paras.forEach((p, i) => {
        const optional = /^If time remains/i.test(p);
        const title = titleByDay[dayNum]?.[i] ?? `Build task ${i + 1}`;
        const t = mkTask(`3.${i + 1}`, title, p, [], { labels: optional ? [] : labels, optional });
        tasks.push(t);
      });
    }
  }
  return { intro, tasks, headerSuffix: stripMd(headerSuffix) };
}

function parseTests(body) {
  const lines = trimBlank(body);
  const { items, intro, trailing } = parseListItems(lines);
  if (!items.length) {
    const t = lines.join('\n').trim();
    return { intro: '', items: t ? [t] : [], evidence: '' };
  }
  const evidence = trailing.replace(/^\*\*Evidence(?: to record)?:\*\*\s*/, '');
  return { intro, items, evidence };
}

function parseDebrief(body) {
  const lines = trimBlank(body);
  const mf = lines.findIndex((l) => /^\*\*MUST FINISH:\*\*/.test(l));
  const debriefLines = mf >= 0 ? lines.slice(0, mf) : lines;
  const prioLines = mf >= 0 ? lines.slice(mf) : [];
  const questions = [];
  const other = [];
  for (const l of debriefLines) {
    const q = l.match(/^\d+\.\s+(.+)$/);
    if (q) questions.push(q[1].trim());
    else other.push(l);
  }
  let text = other.join(' ').replace(/\*\*ACHIEVEMENT\*\* on pass\.?/g, '');
  const aiFree = /written, no Claude/i.test(text);
  const re = /\*\*([A-Za-z][^*]{0,60}?):\*\*/g;
  const marks = [...text.matchAll(re)];
  const f = { recall: '', explain: '', log: '', revisit: '' };
  marks.forEach((m, i) => {
    const label = m[1];
    const content = text.slice(m.index + m[0].length, marks[i + 1]?.index ?? text.length).trim();
    if (/recall/i.test(label)) f.recall = content;
    else if (/^explain/i.test(label)) f.explain = content;
    else if (/^(log|record in)/i.test(label)) f.log = content;
    else if (/^revisit/i.test(label)) f.revisit = content;
  });
  const prioText = prioLines.join(' ');
  const pm = [...prioText.matchAll(/\*\*(MUST FINISH|IF TIME REMAINS|IF STUCK|CARRY FORWARD):\*\*/g)];
  const priorities = {};
  pm.forEach((m, i) => {
    const key = { 'MUST FINISH': 'mustFinish', 'IF TIME REMAINS': 'ifTimeRemains', 'IF STUCK': 'ifStuck', 'CARRY FORWARD': 'carryForward' }[m[1]];
    priorities[key] = prioText.slice(m.index + m[0].length, pm[i + 1]?.index ?? prioText.length).trim();
  });
  return { questions, aiFree, ...f, priorities };
}

function parseTimetable(lines) {
  const rows = tableRows(lines).filter((r) => r[0] !== 'Time');
  return rows.map((r) => {
    const m = r[0].match(/^(\d+:\d+)[–-](\d+:\d+)$/);
    const start = m ? minutesOf(m[1]) : NaN;
    const end = m ? minutesOf(m[2]) : NaN;
    return { time: r[0], start, end, minutes: end - start, activity: stripMd(r[1]), output: stripMd(r[2] ?? '') };
  });
}

function parseDay(dayNum, title, lines, levelOf) {
  const day = { day: dayNum };
  let bossFightId = null;
  const bt = title.match(/^(.+?) · BOSS FIGHT (\d)$/);
  if (bt) {
    day.title = bt[1];
    bossFightId = Number(bt[2]);
  } else day.title = title;
  day.bossFightId = bossFightId;
  day.level = levelOf(dayNum);

  const firstMission = lines.findIndex((l) => /^### /.test(l));
  const head = lines.slice(0, firstMission);
  const dateLine = head.find((l) => /^\*\*\w{3} \d+ \w{3}\*\*$/.test(l));
  day.dateLabel = dateLine ? dateLine.replace(/\*/g, '') : '';
  const dm = day.dateLabel.match(/(\d+) (\w{3})/);
  const months = { Nov: 11, Dec: 12 };
  day.isoDate = dm ? `2026-${String(months[dm[2]]).padStart(2, '0')}-${String(dm[1]).padStart(2, '0')}` : '';
  const field = (re) => head.map((l) => l.match(re)).find(Boolean)?.[1]?.trim() ?? '';
  day.objective = field(/^\*\*Mission objective:\*\* (.+)$/);
  day.prerequisites = field(/^\*\*Prerequisites:\*\* (.+)$/);
  day.unlock = field(/^\*\*Today's unlock:\*\* (.+)$/);
  const tb = head.find((l) => /^\*\*Time budget:\*\*/.test(l)) ?? '';
  const tbm = tb.match(/(\d+(?:\.\d+)?) h \(learn (\d+(?:\.\d+)?) h\) · \*\*Difficulty:\*\* (.+)$/);
  if (!tbm) err(`Day ${dayNum}: cannot parse time budget line: ${tb}`);
  day.plannedHours = tbm ? num(tbm[1]) : 0;
  day.learnHours = tbm ? num(tbm[2]) : 0;
  day.difficulty = tbm ? tbm[3].trim() : '';
  day.timetable = parseTimetable(head);

  // missions
  const sections = [];
  let curS = null;
  for (let i = firstMission; i < lines.length; i++) {
    const l = lines[i];
    const mm = l.match(/^### MISSION (\d+) — (.+)$/);
    const mc = l.match(/^### MISSION COMPLETE — CHECKLIST/);
    if (mm) {
      curS = { num: Number(mm[1]), heading: mm[2], lines: [] };
      sections.push(curS);
    } else if (mc) {
      curS = { num: 'C', heading: 'CHECKLIST', lines: [] };
      sections.push(curS);
    } else if (curS) curS.lines.push(l);
  }
  const sec = (n) => sections.find((s) => s.num === n);
  const need = (n) => {
    const s = sec(n);
    if (!s) err(`Day ${dayNum}: missing MISSION ${n}`);
    return s ?? { num: n, heading: '', lines: [] };
  };
  const s1 = need(1);
  const s2 = need(2);
  const s3 = need(3);
  const s4 = need(4);
  const s5 = need(5);
  const s6 = sec(6) ?? (/MISSION 6/.test(s5.heading) ? s5 : need(6));
  const sc = need('C');

  // XP numbers in headings must match the transparent XP model.
  const xpNum = (s) => Number(s.heading.match(/\((\d+) XP/)?.[1] ?? NaN);
  const expectXp = { 1: 20, 2: 20, 3: 35, 4: 15 };
  [s1, s2, s3, s4].forEach((s, i) => {
    if (xpNum(s) !== expectXp[i + 1]) err(`Day ${dayNum}: Mission ${i + 1} XP heading "${s.heading}" != ${expectXp[i + 1]}`);
  });

  day.learn = parseLearn(s1.lines, day.timetable, dayNum);
  day.learn.headingXp = xpNum(s1);
  day.design = parseDesign(s2.lines);
  const suffix = s3.heading.replace(/^BUILD \(35 XP\)\s*—?\s*/, '');
  day.build = parseBuild(s3.lines, suffix, dayNum);
  day.test = parseTests(s4.lines);

  // challenge (mission 5)
  const combined = s5 === s6 || /MISSION 6/.test(s5.heading);
  const bossRef = s5.heading.match(/^BOSS FIGHT (\d)/);
  if (bossRef) {
    day.challenge = { kind: 'boss', bossFightId: Number(bossRef[1]), title: `Boss Fight ${bossRef[1]}`, markdown: '', aiFree: false };
  } else {
    const suf = s5.heading.replace(/^ENGINEER'S CHALLENGE\s*—?\s*/, '').trim();
    const md = trimBlank(s5.lines).join('\n');
    const aiFree = /no claude|without claude|ai-free|no ai\b/i.test(`${s5.heading} ${md}`) || /no Claude/i.test(suffix + day.build.headerSuffix);
    day.challenge = { kind: 'challenge', title: suf ? stripMd(suf) : "Engineer's challenge", markdown: md, aiFree };
  }
  const debriefBody = combined ? s5.lines : s6.lines;
  day.debrief = parseDebrief(debriefBody);
  day.priorities = day.debrief.priorities;
  delete day.debrief.priorities;
  if (day.debrief.questions.length !== 3) warn(`Day ${dayNum}: expected 3 interview questions, found ${day.debrief.questions.length}`);

  // checklist + tail
  const checklist = [];
  const tail = [];
  for (const l of sc.lines) {
    const c = l.match(/^- \[ \] (.+)$/);
    if (c) checklist.push(c[1]);
    else if (l.trim()) tail.push(l);
  }
  day.sourceChecklist = checklist;
  const tailText = tail.join('\n');
  day.passedWhen = tailText.match(/\*\*MISSION PASSED WHEN:\*\* (.+)/)?.[1]?.trim() ?? '';
  const ach = tailText.match(/\*\*ACHIEVEMENTS?:\*\* (.+)/)?.[1]?.trim() ?? '';
  day.achievementText = stripMd(ach);
  day.nextUnlock = tailText.match(/\*\*NEXT UNLOCK:\*\* (.+)/)?.[1]?.trim() ?? '';
  if (!day.passedWhen) err(`Day ${dayNum}: no "MISSION PASSED WHEN"`);
  if (!day.nextUnlock && dayNum !== 30) err(`Day ${dayNum}: no "NEXT UNLOCK"`);
  day.sourceHash = hash(lines.join('\n')).slice(0, 12);
  return day;
}

function parseDays(levels) {
  const levelOf = (d) => levels.find((l) => d >= l.firstDay && d <= l.lastDay)?.id ?? 0;
  const heads = [];
  pbLines.forEach((l, i) => {
    const m = l.match(/^## DAY (\d+) — (.+)$/);
    if (m) heads.push({ i, day: Number(m[1]), title: m[2].trim() });
  });
  const days = heads.map((h, k) => {
    let end = heads[k + 1]?.i ?? pbLines.length;
    for (let j = h.i + 1; j < end; j++) {
      if (/^# LEVEL|^## 10\./.test(pbLines[j])) {
        end = j;
        break;
      }
    }
    const body = trimBlank(pbLines.slice(h.i + 1, end)).filter((l, idx, arr) => !(idx === arr.length - 1 && /^---$/.test(l)));
    return parseDay(h.day, h.title, body, levelOf);
  });
  return days;
}

// ---------- guide sections ----------
function guideSections() {
  const out = [];
  const grab = (re, title) => {
    const s = sectionBetween(re, /^## (\d+\.|DAY )|^# LEVEL/, pbLines.findIndex((l) => re.test(l)));
    if (!s) return;
    const lines = trimBlank(s.lines.slice(1)).filter((l, i, a) => !(i === a.length - 1 && /^---$/.test(l)));
    out.push({ title, markdown: lines.join('\n').trim() });
  };
  grab(/^## 1\. Cover and mission overview/, 'Mission overview and model rules');
  grab(/^## 2\. How to use this playbook/, 'How to use the playbook');
  grab(/^## 4\. XP and milestone system/, 'XP and milestone system');
  return out;
}

function learningLogTemplate() {
  const i = pbLines.findIndex((l) => /^\*\*Daily LEARNING_LOG\.md entry/.test(l));
  if (i < 0) return '';
  const { fences } = extractFences(pbLines.slice(i + 1, i + 20));
  return fences[0] ?? '';
}

// ---------- assemble + validate ----------
const levels = parseLevels();
const resources = buildResources();
const days = parseDays(levels);
const bossFights = parseBossFights();
const achievements = parseAchievements();
const xpModel = parseXpTable();
const prework = parsePrework();
const acceptance = parseChecklistSection(/^## 11\. Final Day 30 completion checklist/, /^## 12\./);
const portfolio = parseChecklistSection(/^## 12\. Portfolio and job-readiness checklist/, /^\0never$/);

// Hours: playbook vs canonical roadmap tables (V2.1 overrides V2).
for (const d of days) {
  const c = canonHours[d.day];
  if (!c) {
    err(`Day ${d.day}: no canonical hours found in V2/V2.1`);
    continue;
  }
  if (c.hours !== d.plannedHours) {
    conflicts.push({ day: d.day, field: 'plannedHours', playbook: d.plannedHours, canonical: c.hours, source: c.source, resolution: `used ${c.source}` });
    d.plannedHours = c.hours;
  }
  if (c.learn !== d.learnHours) {
    conflicts.push({ day: d.day, field: 'learnHours', playbook: d.learnHours, canonical: c.learn, source: c.source, resolution: `kept playbook timetable (${c.source} lists ${c.learn})` });
  }
  const sum = d.timetable.reduce((a, r) => a + r.minutes, 0);
  if (Math.abs(sum - d.plannedHours * 60) > 0.5) err(`Day ${d.day}: timetable sums to ${sum} min, expected ${d.plannedHours * 60}`);
  if (d.timetable.some((r) => Number.isNaN(r.minutes))) err(`Day ${d.day}: unparseable timetable row`);
}

// Resource references must resolve; derive reverse day index.
const resIds = new Set(resources.map((r) => r.id));
for (const d of days) {
  for (const it of d.learn.items) {
    for (const rid of it.resourceIds) {
      if (!resIds.has(rid)) err(`Day ${d.day}: learn item "${it.title}" references unknown resource ${rid}`);
    }
  }
}
for (const r of resources) {
  const used = days.filter((d) => d.learn.items.some((it) => it.resourceIds.includes(r.id))).map((d) => d.day);
  r.usedInLearnDays = used;
  const extra = used.filter((u) => !r.days.includes(u));
  if (extra.length) conflicts.push({ resource: r.id, field: 'days', roadmapV21: r.days, playbookAlso: extra, resolution: 'union shown' });
  r.allDays = [...new Set([...r.days, ...used])].sort((a, b) => a - b);
}

// Link provenance: every URL in a learn item should appear in the V2.1 resource index.
const knownUrls = new Set(resources.flatMap((r) => [...r.links, ...r.useLinks].map((l) => l.url)));
const v21Urls = new Set([...raw.v21.matchAll(/\((https?:\/\/[^)\s]+)\)/g)].map((m) => m[1]));
const v2Urls = new Set([...raw.v2.matchAll(/\((https?:\/\/[^)\s]+)\)/g)].map((m) => m[1]));
for (const d of days) {
  for (const it of d.learn.items) {
    for (const l of it.links) {
      if (!v21Urls.has(l.url) && !v2Urls.has(l.url) && !knownUrls.has(l.url)) {
        warn(`Day ${d.day}: URL in learn item not found in V2/V2.1 sources: ${l.url}`);
        l.unverified = true;
      }
    }
  }
}

if (days.length !== 30) err(`Expected 30 days, parsed ${days.length}`);
const totalHours = days.reduce((a, d) => a + d.plannedHours, 0);
if (totalHours !== 179) err(`Planned hours total ${totalHours}, expected 179`);
levels.forEach((lv) => {
  const h = days.filter((d) => d.level === lv.id).reduce((a, d) => a + d.plannedHours, 0);
  if (h !== lv.plannedHours) err(`Level ${lv.id}: days sum to ${h} h, level header says ${lv.plannedHours} h`);
});
if (bossFights.length !== 4) err(`Expected 4 boss fights, parsed ${bossFights.length}`);
bossFights.forEach((b) => {
  if (!b.tasks.length || !b.passWhen) err(`Boss fight ${b.id} is incomplete`);
});
if (xpModel.reduce((a, r) => a + r.xp, 0) !== 100) err('XP table does not sum to 100');

const out = {
  meta: {
    title: 'AI Engineer Quest',
    project: 'IncidentOps AI',
    window: 'Thu 12 Nov – Fri 11 Dec 2026',
    totalHours,
    totalXp: 3000,
    sources: Object.fromEntries(Object.entries(FILES).map(([k, f]) => [k, { file: f, sha256: hash(raw[k]).slice(0, 16) }])),
    precedence: ['Roadmap V2.1', 'Roadmap V2', 'Playbook'],
    conflicts,
    importReport: { warnings, errors },
    learningLogTemplate: learningLogTemplate(),
    guide: guideSections(),
  },
  levels,
  xpModel,
  prework,
  days,
  resources,
  bossFights,
  acceptanceChecklist: acceptance,
  portfolioChecklist: portfolio,
  achievements,
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n');
console.log(`Imported ${days.length} days, ${resources.length} resources, ${bossFights.length} boss fights, ${achievements.length} achievements`);
console.log(`Planned hours: ${totalHours}. Conflicts resolved: ${conflicts.length}. Warnings: ${warnings.length}. Errors: ${errors.length}`);
warnings.forEach((w) => console.warn(`WARN: ${w}`));
if (errors.length) fail();
