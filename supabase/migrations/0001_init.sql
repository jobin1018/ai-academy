-- AI Engineer Quest: per-user progress tables.
-- Curriculum content lives in the repo (src/curriculum); only your progress is stored here.
-- Run this once in the Supabase SQL editor (or `supabase db push`).

-- Keep the newer row when two devices write the same row: a stale device can never overwrite
-- a newer value, even if it pushes late. (The app also merges client-side before pushing.)
create or replace function public.keep_newer_row() returns trigger
language plpgsql as $$
begin
  if new.updated_at < old.updated_at then
    return old; -- ignore the stale write
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------- item_progress
-- One row per tickable item (resource, build task, test, challenge answer, boss task, ...).
create table if not exists public.item_progress (
  user_id    uuid        not null references auth.users (id) on delete cascade,
  item_key   text        not null check (char_length(item_key) between 1 and 80),
  done       boolean     not null default false,
  text       text        not null default '' check (char_length(text) <= 20000),
  url        text        not null default '' check (char_length(url) <= 2000),
  rating     smallint    check (rating between 1 and 3),
  updated_at timestamptz not null default now(),
  primary key (user_id, item_key)
);

-- ---------------------------------------------------------------- day_progress
create table if not exists public.day_progress (
  user_id       uuid        not null references auth.users (id) on delete cascade,
  day           smallint    not null check (day between 1 and 30),
  completed_at  timestamptz,
  minutes_spent integer     not null default 0 check (minutes_spent between 0 and 1440),
  updated_at    timestamptz not null default now(),
  primary key (user_id, day)
);

-- ---------------------------------------------------------------- journal_entries
create table if not exists public.journal_entries (
  user_id                   uuid        not null references auth.users (id) on delete cascade,
  day                       smallint    not null check (day between 1 and 30),
  learned                   text        not null default '' check (char_length(learned) <= 20000),
  implemented_independently text        not null default '' check (char_length(implemented_independently) <= 20000),
  claude_helped             text        not null default '' check (char_length(claude_helped) <= 20000),
  can_explain               text        not null default '' check (char_length(can_explain) <= 20000),
  problems                  text        not null default '' check (char_length(problems) <= 20000),
  questions_to_revisit      text        not null default '' check (char_length(questions_to_revisit) <= 20000),
  commit_url                text        not null default '' check (char_length(commit_url) <= 2000),
  updated_at                timestamptz not null default now(),
  primary key (user_id, day)
);

-- ---------------------------------------------------------------- user_settings
create table if not exists public.user_settings (
  user_id     uuid        primary key references auth.users (id) on delete cascade,
  theme       text        not null default 'dark' check (theme in ('dark', 'light', 'system')),
  last_day    smallint    check (last_day between 1 and 30),
  last_step   text        check (last_step in ('learn', 'design', 'build', 'test', 'challenge', 'debrief')),
  show_streak boolean     not null default false,
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------- achievement_unlocks
create table if not exists public.achievement_unlocks (
  user_id        uuid        not null references auth.users (id) on delete cascade,
  achievement_id text        not null check (char_length(achievement_id) between 1 and 80),
  unlocked_at    timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

-- ---------------------------------------------------------------- triggers
do $$
declare t text;
begin
  foreach t in array array['item_progress', 'day_progress', 'journal_entries', 'user_settings'] loop
    execute format('drop trigger if exists keep_newer on public.%I', t);
    execute format('create trigger keep_newer before update on public.%I for each row execute function public.keep_newer_row()', t);
  end loop;
end $$;

-- ---------------------------------------------------------------- Row Level Security
-- Each user can only see and change their own rows. There is no policy for anon access, so
-- unauthenticated requests get nothing. (service_role bypasses RLS and must never be shipped
-- to the browser.)
do $$
declare t text;
begin
  foreach t in array array['item_progress', 'day_progress', 'journal_entries', 'user_settings', 'achievement_unlocks'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);

    execute format('drop policy if exists "%s_select_own" on public.%I', t, t);
    execute format('drop policy if exists "%s_insert_own" on public.%I', t, t);
    execute format('drop policy if exists "%s_update_own" on public.%I', t, t);
    execute format('drop policy if exists "%s_delete_own" on public.%I', t, t);

    execute format('create policy "%s_select_own" on public.%I for select to authenticated using ((select auth.uid()) = user_id)', t, t);
    execute format('create policy "%s_insert_own" on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)', t, t);
    execute format('create policy "%s_update_own" on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t, t);
    execute format('create policy "%s_delete_own" on public.%I for delete to authenticated using ((select auth.uid()) = user_id)', t, t);
  end loop;
end $$;

-- Table privileges: only signed-in users, only through the policies above.
revoke all on public.item_progress, public.day_progress, public.journal_entries, public.user_settings, public.achievement_unlocks from anon;
grant select, insert, update, delete on public.item_progress, public.day_progress, public.journal_entries, public.user_settings, public.achievement_unlocks to authenticated;
