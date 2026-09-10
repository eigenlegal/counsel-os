import { wordOutputFilename } from '../../../src/workspace/working-preferences';

/** Uses the same formatter and variant strings as real Word exports. */
export function FilenameExamples({ pattern, author, redlineLabel = 'redline', draftLabel = 'draft', date = new Date().toISOString().slice(0, 10) }: {
  pattern: string; author: string; date?: string; redlineLabel?: string; draftLabel?: string;
}): JSX.Element {
  let redline: string, draft: string;
  try {
    const word = {filenamePattern: pattern, author, redlineLabel, draftLabel};
    redline = wordOutputFilename(word, { document: 'Mutual NDA', variant: 'redline', date });
    draft = wordOutputFilename(word, { document: 'NDA review', variant: 'draft', date });
  } catch {
    return <p className="field-help">Enter a valid filename pattern to see examples.</p>;
  }
  return <div className="filename-examples" role="group" aria-label="Example Word filenames">
    <dl>
      <div><dt>Redlining Mutual NDA.docx</dt><dd><code>{redline}</code></dd></div>
      <div><dt>Downloading an “NDA review” answer</dt><dd><code>{draft}</code></dd></div>
    </dl>
    <p><code>{'{variant}'}</code> becomes <code>{redlineLabel}</code> for tracked changes or <code>{draftLabel}</code> for an answer downloaded as Word. <code>{'{document}'}</code> uses the original filename without .docx, or the answer’s title.</p>
  </div>;
}
