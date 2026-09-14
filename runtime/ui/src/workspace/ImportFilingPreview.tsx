import type { ImportFilingSummary } from '../../../src/workspace/import-organization-job-types';

/** Grouped staged destinations, never a claim that files have been imported. */
export function ImportFilingPreview({ summary }: { summary: ImportFilingSummary }) {
  return <section className="import-filing-preview" aria-label="Prepared filing summary">
    <h3>Where your files will go</h3>
    <dl className="import-filing-counts">
      <div><dt>Matter documents</dt><dd>{summary.matters}</dd></div>
      <div><dt>Practice materials</dt><dd>{summary.practice}</dd></div>
      <div><dt>External sources</dt><dd>{summary.external}</dd></div>
      <div><dt>Unfiled</dt><dd>{summary.unfiled}</dd></div>
      {summary.profiles > 0 && <div><dt>Profile & preferences</dt><dd>{summary.profiles}</dd></div>}
    </dl>
    {summary.groups.length > 0 && <details><summary>{summary.groupCount} matter {summary.groupCount === 1 ? 'group' : 'groups'}</summary>
      <ul>{summary.groups.map((group, index) => <li key={index}><span>{group.title}{group.isNew && <small>New matter</small>}</span><span>{group.files} {group.files === 1 ? 'file' : 'files'}</span></li>)}</ul>
      {summary.groupCount > summary.groups.length && <p className="fine-print">Showing the {summary.groups.length} largest groups. Use the file list to inspect any other group.</p>}
    </details>}
    <p className="fine-print">These are staged choices. Importing will make matter documents available to that matter’s chats. Practice guidance still needs separate approval.</p>
  </section>;
}
