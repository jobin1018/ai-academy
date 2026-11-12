import type { SupabaseClient } from '@supabase/supabase-js';
import { defaultSettings, type ThemePref } from '@/domain/types';
import type { PushBatch, RemoteSnapshot } from './progressStore';
import type { RemoteStore } from './sync';

const iso = (ms: number) => new Date(ms).toISOString();
const ms = (s: string) => new Date(s).getTime();

/**
 * Supabase-backed remote. Every row carries the signed-in user's id; Row Level Security (see
 * supabase/migrations) ensures a user can only read and write their own rows, so the anon key that
 * ships to the browser cannot reach anyone else's data.
 */
export class SupabaseRemote implements RemoteStore {
  constructor(
    private readonly sb: SupabaseClient,
    private readonly userId: string,
  ) {}

  async fetchAll(): Promise<RemoteSnapshot> {
    const [items, days, journal, settings, unlocks] = await Promise.all([
      this.sb.from('item_progress').select('item_key,done,text,url,rating,updated_at').eq('user_id', this.userId),
      this.sb.from('day_progress').select('day,completed_at,minutes_spent,updated_at').eq('user_id', this.userId),
      this.sb.from('journal_entries').select('*').eq('user_id', this.userId),
      this.sb.from('user_settings').select('*').eq('user_id', this.userId).maybeSingle(),
      this.sb.from('achievement_unlocks').select('achievement_id,unlocked_at').eq('user_id', this.userId),
    ]);
    for (const r of [items, days, journal, settings, unlocks]) if (r.error) throw new Error(r.error.message);

    return {
      items: (items.data ?? []).map((r) => ({ key: r.item_key, done: r.done, text: r.text ?? '', url: r.url ?? '', rating: r.rating, updatedAt: ms(r.updated_at) })),
      days: (days.data ?? []).map((r) => ({ day: r.day, completedAt: r.completed_at ? ms(r.completed_at) : null, minutesSpent: r.minutes_spent ?? 0, updatedAt: ms(r.updated_at) })),
      journal: (journal.data ?? []).map((r) => ({
        day: r.day,
        learned: r.learned ?? '',
        implementedIndependently: r.implemented_independently ?? '',
        claudeHelped: r.claude_helped ?? '',
        canExplain: r.can_explain ?? '',
        problems: r.problems ?? '',
        questionsToRevisit: r.questions_to_revisit ?? '',
        commitUrl: r.commit_url ?? '',
        updatedAt: ms(r.updated_at),
      })),
      settings: settings.data
        ? {
            ...defaultSettings(),
            theme: (settings.data.theme as ThemePref) ?? 'dark',
            lastDay: settings.data.last_day,
            lastStep: settings.data.last_step,
            showStreak: !!settings.data.show_streak,
            updatedAt: ms(settings.data.updated_at),
          }
        : null,
      unlocks: (unlocks.data ?? []).map((r) => ({ id: r.achievement_id, at: ms(r.unlocked_at) })),
    };
  }

  async push(b: PushBatch): Promise<void> {
    const uid = this.userId;
    const ops: PromiseLike<{ error: { message: string } | null }>[] = [];
    if (b.items.length)
      ops.push(
        this.sb.from('item_progress').upsert(
          b.items.map((r) => ({ user_id: uid, item_key: r.key, done: r.done, text: r.text, url: r.url, rating: r.rating, updated_at: iso(r.updatedAt) })),
          { onConflict: 'user_id,item_key' },
        ),
      );
    if (b.days.length)
      ops.push(
        this.sb.from('day_progress').upsert(
          b.days.map((r) => ({ user_id: uid, day: r.day, completed_at: r.completedAt ? iso(r.completedAt) : null, minutes_spent: r.minutesSpent, updated_at: iso(r.updatedAt) })),
          { onConflict: 'user_id,day' },
        ),
      );
    if (b.journal.length)
      ops.push(
        this.sb.from('journal_entries').upsert(
          b.journal.map((r) => ({
            user_id: uid,
            day: r.day,
            learned: r.learned,
            implemented_independently: r.implementedIndependently,
            claude_helped: r.claudeHelped,
            can_explain: r.canExplain,
            problems: r.problems,
            questions_to_revisit: r.questionsToRevisit,
            commit_url: r.commitUrl,
            updated_at: iso(r.updatedAt),
          })),
          { onConflict: 'user_id,day' },
        ),
      );
    if (b.settings)
      ops.push(
        this.sb.from('user_settings').upsert(
          { user_id: uid, theme: b.settings.theme, last_day: b.settings.lastDay, last_step: b.settings.lastStep, show_streak: b.settings.showStreak, updated_at: iso(b.settings.updatedAt) },
          { onConflict: 'user_id' },
        ),
      );
    if (b.unlocks.length)
      ops.push(
        this.sb.from('achievement_unlocks').upsert(
          b.unlocks.map((r) => ({ user_id: uid, achievement_id: r.id, unlocked_at: iso(r.at) })),
          { onConflict: 'user_id,achievement_id', ignoreDuplicates: true },
        ),
      );
    const results = await Promise.all(ops);
    const failed = results.find((r) => r.error);
    if (failed?.error) throw new Error(failed.error.message);
  }
}
