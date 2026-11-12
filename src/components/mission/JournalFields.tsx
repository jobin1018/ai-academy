import { emptyJournal } from '@/domain/types';
import { AutoLine, AutoText } from '@/components/ui/primitives';
import { useProgress, useStore } from '@/store/context';

const FIELDS = [
  { key: 'learned', label: 'What I learned', rows: 4 },
  { key: 'implementedIndependently', label: 'What I independently implemented', rows: 3 },
  { key: 'claudeHelped', label: 'What Claude Code helped implement', rows: 3 },
  { key: 'canExplain', label: 'What I can explain without assistance', rows: 3 },
  { key: 'problems', label: 'Problems encountered', rows: 3 },
  { key: 'questionsToRevisit', label: 'Questions and unclear concepts to revisit', rows: 3 },
] as const;

/** The journal editor for one day. Autosaves through the same store as everything else. */
export function JournalFields({ day, only }: { day: number; only?: (typeof FIELDS)[number]['key'][] }) {
  const store = useStore();
  const data = useProgress();
  const j = data.journal[day] ?? emptyJournal();
  const minutes = data.days[day]?.minutesSpent ?? 0;
  const fields = only ? FIELDS.filter((f) => only.includes(f.key)) : FIELDS;
  return (
    <div className="space-y-4">
      {fields.map((f) => (
        <AutoText key={f.key} label={f.label} rows={f.rows} value={j[f.key]} onCommit={(v) => store.setJournal(day, { [f.key]: v })} />
      ))}
      {!only && (
        <div className="grid gap-4 sm:grid-cols-2">
          <AutoLine label="GitHub commit URL" type="url" inputMode="url" placeholder="https://github.com/you/incidentops-ai/commit/…" value={j.commitUrl} onCommit={(v) => store.setJournal(day, { commitUrl: v })} />
          <AutoLine
            label="Time spent (minutes)"
            inputMode="numeric"
            placeholder="0"
            value={minutes ? String(minutes) : ''}
            onCommit={(v) => store.setDay(day, { minutesSpent: Math.max(0, Math.min(1440, Number.parseInt(v.replace(/\D/g, ''), 10) || 0)) })}
          />
        </div>
      )}
    </div>
  );
}
