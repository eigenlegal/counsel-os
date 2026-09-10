/** Synthetic render fixtures generated through the production export service. */
import { WorkspaceStore } from '../runtime/src/workspace/store';
import { join, resolve } from 'node:path';
import { mkdirSync } from 'node:fs';
const directory = process.argv[2];
if (!directory) throw new Error('Provide an explicit QA output directory.');
const out = resolve(directory);
mkdirSync(out, { recursive: true });
const store = new WorkspaceStore({ databasePath: ':memory:' });
try {
  const source = store.createSource({
    kind: 'document',
    revision: {
      title: 'Synthetic notice provision',
      body: 'Notice must be given in writing to the designated recipient.',
      provenance: { origin: 'fixture:notice' },
    },
  });
  const base =
    '## Assessment\n\nThe notice should be **written** and sent to the designated recipient. The timing remains *unresolved*.\n\n### Recommended steps\n\n3. Confirm the recipient and address.\n4. Review the notice period.\n   - Keep the date provisional until verified.\n   - Retain evidence of delivery.\n\n| Topic | Current position | Next step |\n| --- | --- | --- |\n| Form | Written notice | Prepare a short letter |\n| Timing | Unresolved | Confirm the applicable period |\n\n> The available material does not resolve when the period starts.\n\nNo decision to send notice has been recorded.';
  const rows = Array.from(
    { length: 42 },
    (_, n) =>
      `| ${n + 1} | Interview ${n + 1} | The witness account remains uncorroborated; confirm dates against the underlying records before relying on this entry. |`,
  ).join('\n');
  for (const [name, answer] of [
    ['notice', base],
    [
      'long-table',
      `## Working chronology\n\nEntries remain provisional.\n\n| Entry | Event | Evidence and next step |\n| --- | --- | --- |\n${rows}\n\n## Open questions\n\nWhat additional records resolve the disputed timing?`,
    ],
  ] as const) {
    const work = store.recordWork({
      title: name === 'notice' ? 'Notice assessment' : 'Investigation chronology',
      request: 'Synthetic QA only',
      answer,
      evidence: [
        {
          target: { kind: 'source', revisionId: source.latest.id },
          start: 0,
          quote: source.latest.body!,
          locator: 'Section 9',
        },
      ],
    });
    const file = await store.exports.create(work.id);
    await Bun.write(join(out, `${name}.docx`), store.exports.download(file.id).bytes);
    console.log(`${name}: ${file.byteCount} bytes`);
  }
} finally {
  store.close();
}
