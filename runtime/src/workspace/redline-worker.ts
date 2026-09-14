import { boundedWordPackage } from './word-package';
import { applyRedlines } from '../docx/redline';
import { RedlineInput } from './redlines';
import { RevisionAuthor } from './working-preferences';
import { prepareBlockInsertions } from '../docx/insert';

export async function runRedlineWorker(): Promise<void> {
globalThis.fetch = Object.assign(async () => { throw new Error('External resources are not fetched.'); }, { preconnect: () => {} });
try {
  const raw = JSON.parse(await new Response(Bun.stdin.stream()).text());
  const input = RedlineInput.parse(raw.input), edits = input.edits;
  const bytes = Buffer.from(raw.bytes, 'base64');
  const pkg = boundedWordPackage(bytes);
  const author = RevisionAuthor.parse(raw.author ?? 'Counsel OS');
  const insert = prepareBlockInsertions(pkg, input.insertions ?? [], author);
  const report = applyRedlines(pkg, edits, { track: true, defaultAuthor: author });
  if (report.skipped.length || report.warnings.length || report.notes.length)
    throw new Error(`No output was saved because not every edit could be applied safely. ${report.skipped.map(item => `Edit ${item.index + 1}: ${item.reason}`).join(' ')} ${report.warnings.map(item => item.warning).join(' ')} ${report.notes.join(' ')}`.slice(0, 2000));
  if (report.applied.length !== edits.length) throw new Error('Not every requested edit was applied.');
  for (const item of insert()) {
    report.applied.push({ index: edits.length + item.index, location: item.location, occurrence: 1 });
    report.stats.paragraphs += item.paragraphs; report.stats.regions += item.paragraphs; report.stats.comments += item.comments;
  }
  console.log(JSON.stringify({ bytes: Buffer.from(pkg.save()).toString('base64'), report }));
} catch (error) {
  console.log(JSON.stringify({ error: error instanceof Error ? error.message : 'Word editing failed. The original is unchanged.' }));
}
}
if (import.meta.main) await runRedlineWorker();
