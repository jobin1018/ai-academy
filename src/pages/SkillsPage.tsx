import { Award, Check, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ACHIEVEMENTS, DAYS, LEVELS } from '@/curriculum';
import { Badge, Bar, Card, SectionTitle, cx } from '@/components/ui/primitives';
import { dayStatus, skillProgress, weekProgress } from '@/domain/progress';
import { SKILLS } from '@/curriculum/meta';
import { useProgress } from '@/store/context';

function Tree({ skillId }: { skillId: string }) {
  const data = useProgress();
  const skill = SKILLS.find((s) => s.id === skillId)!;
  return (
    <ol className="relative flex flex-wrap items-center gap-y-2">
      {skill.days.map((n, i) => {
        const d = DAYS[n - 1];
        const st = dayStatus(data, d);
        return (
          <li key={n} className="flex items-center">
            {i > 0 && <span className={cx('h-0.5 w-3 sm:w-5', st.completed ? 'bg-accent/60' : 'bg-line')} aria-hidden />}
            <Link
              to={`/day/${n}`}
              title={`Day ${n}: ${d.title}`}
              aria-label={`Day ${n}: ${d.title}, ${st.completed ? 'completed' : st.percent + ' percent'}`}
              className={cx('grid h-10 w-10 place-items-center rounded-full border-2 text-xs font-bold transition hover:scale-110', st.completed ? 'border-accent bg-accent text-accentink' : st.percent > 0 ? 'border-iris text-ink' : 'border-line text-faint')}
            >
              {st.completed ? <Check size={16} strokeWidth={3.5} /> : n}
            </Link>
          </li>
        );
      })}
    </ol>
  );
}

export default function SkillsPage() {
  const data = useProgress();
  const skills = skillProgress(data);
  const unlocked = ACHIEVEMENTS.filter((a) => a.id in data.unlocks);
  return (
    <div className="space-y-9">
      <header className="animate-rise">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Skills & achievements</h1>
        <p className="mt-2 max-w-2xl text-muted">Completing a task and being able to do it alone are different things. Each skill shows both: <strong className="text-ink">tasks completed</strong>, and <strong className="text-ink">independently demonstrated</strong> (the AI-free tasks you finished without Claude).</p>
      </header>

      <section>
        <SectionTitle>Skill tree</SectionTitle>
        <div className="grid gap-4 md:grid-cols-2">
          {skills.map((s) => (
            <Card key={s.id} className="p-5">
              <div className="flex items-start justify-between gap-3"><h3 className="font-semibold">{s.name}</h3><span className="text-xs tabular-nums text-muted">{s.taskPercent}%</span></div>
              <p className="mt-1 text-sm text-muted">{s.blurb}</p>
              <div className="mt-4"><Tree skillId={s.id} /></div>
              <div className="mt-4 space-y-2.5">
                <div><div className="mb-1 flex justify-between text-xs text-muted"><span>Tasks completed</span><span>{s.taskPercent}%</span></div><Bar value={s.taskPercent} label={`${s.name} tasks completed`} /></div>
                <div><div className="mb-1 flex justify-between text-xs text-muted"><span>Demonstrated independently (AI-free)</span><span>{s.demonstratedDone}/{s.demonstratedTotal}</span></div><Bar value={s.demonstratedPercent} color="var(--iris)" label={`${s.name} demonstrated independently`} /></div>
              </div>
            </Card>
          ))}
        </div>
        <p className="mt-3 text-xs text-faint">Which days feed which skill is an app-level grouping by topic (see src/curriculum/meta.ts); it does not change any roadmap requirement.</p>
      </section>

      <section>
        <SectionTitle aside={<span className="text-xs text-muted">{unlocked.length} of {ACHIEVEMENTS.length} unlocked</span>}>Achievements</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ACHIEVEMENTS.map((a) => {
            const at = data.unlocks[a.id];
            const boss = a.bossFightId;
            return (
              <Card key={a.id} className={cx('relative overflow-hidden p-4', at ? 'border-accent/30' : 'opacity-75')}>
                <div className="flex items-start gap-3">
                  <span className={cx('grid h-10 w-10 shrink-0 place-items-center rounded-xl', at ? 'bg-accentsoft text-accent' : 'bg-surface3 text-faint')} style={at && boss ? { background: `color-mix(in srgb, var(--l${boss}) 18%, transparent)`, color: `var(--l${boss})` } : undefined}>{at ? <Award size={20} /> : <Lock size={17} />}</span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5"><h3 className="text-[15px] font-semibold leading-snug">{a.name}</h3>{boss && <Badge tone="warn">Boss</Badge>}</div>
                    <div className="text-xs text-faint">Day {a.days.join('–')}{at ? ` · unlocked ${new Date(at).toLocaleDateString()}` : ''}</div>
                    <p className="mt-1.5 text-[13px] text-muted"><span className="text-faint">Evidence: </span>{a.evidence}</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      <section>
        <SectionTitle>Level and weekly progress</SectionTitle>
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead><tr className="border-b border-line text-left text-[11px] uppercase tracking-wider text-faint"><th className="px-4 py-3">Week</th><th className="py-3">Days</th><th className="py-3">Completed</th><th className="py-3">XP</th><th className="px-4 py-3 text-right">Focused / planned</th></tr></thead>
            <tbody>
              {[1, 2, 3, 4, 5].map((w) => {
                const p = weekProgress(data, w);
                const lv = LEVELS.find((l) => p.days[0] >= l.firstDay && p.days[0] <= l.lastDay);
                return (
                  <tr key={w} className="border-b border-line/60 last:border-0">
                    <td className="px-4 py-3 font-medium">Week {w}{lv && <span className="ml-2 text-xs" style={{ color: `var(--l${lv.id})` }}>L{lv.id}</span>}</td>
                    <td className="py-3 text-muted">{p.days[0]}–{p.days[p.days.length - 1]}</td>
                    <td className="py-3">{p.done}/{p.total}</td>
                    <td className="py-3 tabular-nums">{p.xp} / {p.total * 100}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted">{(p.minutes / 60).toFixed(1)} h / {p.plannedHours} h</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      </section>
    </div>
  );
}
