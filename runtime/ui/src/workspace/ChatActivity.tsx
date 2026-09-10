import type { Activity } from '../../../src/workspace/conversations';
import type { ChatCitation } from './api';
import { Icon } from './icons';

const object = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};

/** Presentation only: no stored attempt is edited or inferred from similar text.
 * Only a later successful check of the same exact quote/version can recover it. */
export function activityRows(activity: Activity[], citations: ChatCitation[]) {
  const aliases = new Map<string, string>();
  for (const item of activity) {
    if (item.name !== 'counsel_read_record' || item.status !== 'complete') continue;
    const output = object(item.output);
    if (typeof output.readHandle === 'string' && typeof output.id === 'string' && typeof output.kind === 'string')
      aliases.set(JSON.stringify([output.kind, output.readHandle]), output.id);
  }
  const key = (input: Record<string, unknown>) => {
    if (!['source', 'knowledge', 'work'].includes(String(input.kind)) || typeof input.id !== 'string' || typeof input.quote !== 'string' || !input.quote) return null;
    return JSON.stringify([input.kind, aliases.get(JSON.stringify([input.kind, input.id])) ?? input.id, input.quote]);
  };
  const pending = new Map<string, Activity[]>();
  const recovered = new Set<string>();
  const rows = activity.map(item => {
    const row = { activity: item, retries: [] as Activity[] };
    if (item.name !== 'counsel_cite_passage') return row;
    const input = object(item.input), identity = key(input);
    if (!identity) return row;
    if (item.status === 'failed') pending.set(identity, [...(pending.get(identity) ?? []), item]);
    if (item.status === 'complete') {
      const marker = object(item.output).marker;
      const citation = citations.find(c => marker === `[${c.key}]`);
      const verified = citation && key({ kind: citation.target.kind,
        id: citation.target.kind === 'work' ? citation.target.workId : citation.target.revisionId,
        quote: citation.quote }) === identity;
      if (verified) {
        row.retries = pending.get(identity) ?? [];
        row.retries.forEach(retry => recovered.add(retry.id));
        pending.delete(identity);
      }
    }
    return row;
  });
  return rows.filter(row => !recovered.has(row.activity.id));
}

function Attempt({ activity }: { activity: Activity }) {
  return <details><summary>
    <span className={`activity-indicator ${activity.status}`} />
    <span>{activity.label}</span><small>{activity.status}</small>
  </summary><div className="tool-detail">
    <strong>Request</strong><pre>{JSON.stringify(activity.input, null, 2)}</pre>
    <strong>Result</strong><pre>{activity.output === undefined ? 'Waiting for result…' : JSON.stringify(activity.output, null, 2)}</pre>
  </div></details>;
}

export function ChatActivity({ activity, citations, running }: { activity: Activity[]; citations: ChatCitation[]; running: boolean }) {
  if (!activity.length) return null;
  return <details className="chat-activity"><summary>
    <Icon name={running ? 'clock' : 'check'} size={15} />
    {activity.length} actions <span>{activity.at(-1)?.label}</span>
  </summary><ol>{activityRows(activity, citations).map(({ activity: item, retries }) => <li key={item.id}>
    {retries.length ? <details className="citation-recovered"><summary>
      <span className="activity-indicator complete" /><span>Citation verified</span>
      <small>{retries.length} {retries.length === 1 ? 'retry' : 'retries'} recovered</small>
    </summary>
      <p className="citation-retry-note">The same quote and source were verified on a later attempt. Original checks are retained below.</p>
      <ol className="citation-retries">{[...retries, item].map(attempt => <li key={attempt.id}><Attempt activity={attempt} /></li>)}</ol>
    </details> : <Attempt activity={item} />}
  </li>)}</ol></details>;
}
