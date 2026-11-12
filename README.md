# AI Engineer Quest

A personal learning command center for the 30-day Applied AI Engineering program (IncidentOps AI capstone).
React + TypeScript + Vite + Tailwind v4, Radix primitives, Supabase (Auth + Postgres + RLS).

## Local development

```bash
npm install
npm run dev          # http://localhost:5173
npm test             # curriculum completeness, progress/XP logic, sync
npm run build        # regenerates curriculum, type-checks, builds to dist/
```

Without Supabase settings the app runs in a clearly labelled **local-only mode** (progress stays in this browser; it does not sync).

## Curriculum

The three source documents in the repo root are the source of truth. `npm run curriculum` parses them into
`src/curriculum/data/curriculum.generated.json` (committed). Nothing is hand-copied or summarised.
Precedence: Roadmap V2.1 > Roadmap V2 > playbook. Differences are recorded in `meta.conflicts` and shown in Settings.
After editing a source document, run `npm run curriculum` and `npm test`.

The importer fails (exit 1) on structural problems; tests additionally check 30 days, 179 h (also against the V2/V2.1 hour tables),
every task heading, every checklist line, every Claude Code prompt, every learning URL, resource references, boss fights and 3000 XP.

## Supabase setup

1. Create a project at supabase.com.
2. SQL editor: run `supabase/migrations/0001_init.sql` (tables, Row Level Security, keep-newer-row trigger).
3. Authentication → URL configuration: add your dev and production URLs as redirect URLs. Enable Email provider.
4. `cp .env.example .env` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (anon/public key only; never the service_role key).

## Deployment (Vercel or Netlify)

Build command `npm run build`, output `dist`. Set the two `VITE_` variables in the host's settings.
Add an SPA fallback: Vercel `vercel.json` `{"rewrites":[{"source":"/(.*)","destination":"/"}]}`; Netlify `public/_redirects` containing `/* /index.html 200`.

## How progress works

- XP is derived, never typed: Learn 20, Design 20, Build 35, Test 15, Challenge+Debrief 10 per day (3000 total), partial credit only inside a mission.
- A learning item needs a tick **and** written notes; a test needs a tick; evidence needs text or a link. Ticking alone does not earn XP.
- A day completes only when all mandatory items are done and the sign-off is attested with evidence. Days 7, 14, 21 and 30 also require their boss fight (Boss Fight 3 may pass as "Partial" with a recorded cut).
- Data flow: edits apply instantly to a local cache and sync to Supabase (debounced, retried offline). Conflicts resolve per row by newest edit (client clocks; the database also refuses stale overwrites).

## Known limitations

- **Supabase sync is not verified against a live project** (no credentials here). The sync logic is tested against an in-memory server simulating two devices; the SQL and RLS policies are written but unexecuted.
- PWA/offline install is not implemented (the plugin is installed but unconfigured). Local cache gives offline editing while the page is loaded.
- "Open claude.ai with this draft" uses claude.ai's `?q=` URL parameter; I did not verify it prefills. Nothing is sent automatically.
- Skill-to-day grouping and library categories are app-defined (`src/curriculum/meta.ts`).
- The playbook has no per-task estimates or per-challenge hints; none were invented. See Settings → "Open points".
- Row-level last-write-wins means two devices editing the same textarea simultaneously keep only the newer text.
