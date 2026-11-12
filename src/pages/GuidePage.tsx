import { Markdown } from '@/components/ui/Markdown';
import { Card } from '@/components/ui/primitives';
import { curriculum } from '@/curriculum';

/** The playbook's own rules, rendered from the source: model rules, task labels, XP system. */
export default function GuidePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="animate-rise">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Playbook guide</h1>
        <p className="mt-2 text-muted">The rules of the programme, taken verbatim from the playbook so you never have to reopen the Markdown file.</p>
      </header>
      {curriculum.meta.guide.map((g) => (
        <Card key={g.title} className="p-5 sm:p-6">
          <h2 className="mb-3 text-lg font-semibold">{g.title}</h2>
          <Markdown>{g.markdown}</Markdown>
        </Card>
      ))}
    </div>
  );
}
