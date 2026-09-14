import { practiceCapabilityNotes } from '../../../src/workspace/practice-capabilities';

export function PracticeSupport({ text }: { text: string }) {
  const notes = practiceCapabilityNotes(text);
  if (!notes.length) return null;
  return <aside className="practice-support" aria-label="What these instructions can do"><h3>How this works in Counsel</h3>
    <dl>{notes.map(note => <div key={note.title}><dt>{note.title}</dt><dd>{note.detail}</dd></div>)}</dl>
    <p className="fine-print">These boundaries do not prevent saving the rest of your preferences. Remembering an external workflow does not enable it.</p>
  </aside>;
}
