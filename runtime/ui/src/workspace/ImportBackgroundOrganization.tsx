import { useEffect, useRef, useState } from 'react';
import { request, type Snapshot } from './api';
import type { ImportBatch, ImportChoice } from '../../../src/workspace/import-types';
import type { OrganizationJob } from '../../../src/workspace/import-organization-job-types';
import { ErrorNotice, Modal } from './components';

export function organizationRequest(batch: ImportBatch, data: Snapshot, instruction = '') {
  const config = data.connection.config;
  if (!data.connection.ready || !config) throw new Error('Connect AI in Settings, or organize these files manually.');
  return { requestId: crypto.randomUUID(), expectedRevisionId: batch.revisionId, shareForSuggestions: true,
    instruction, modelChoice: { kind: config.kind, model: config.model,
      ...(config.kind === 'claude-code' ? { claudeBilling: config.claudeBilling } : {}) } };
}
function location(choice: ImportChoice, names: Array<{ id: string; title: string }>) {
  if (choice.matterTitle) return `New matter: ${choice.matterTitle}`;
  if (choice.matterId) return `Matter: ${names.find(item => item.id === choice.matterId)?.title ?? 'Selected matter'}`;
  if (choice.destination === 'source') return choice.collection === 'external' ? 'Sources' : choice.collection === 'practice' ? 'Practice files' : 'Unfiled';
  return `Practice · ${choice.destination}`;
}

export function ImportBackgroundOrganization({ batch, data, changed, onRunningChange }: { batch: ImportBatch; data: Snapshot; changed: () => void; onRunningChange?: (running: boolean) => void }) {
  const [job, setJob] = useState<OrganizationJob | null>(null), [error, setError] = useState('');
  const [busy, setBusy] = useState(false), [review, setReview] = useState(false);
  const [attention, setAttention] = useState(false), [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<string[]>([]), [instruction, setInstruction] = useState('');
  const frozen = useRef(false); frozen.current = busy || review;
  const base = `/imports/${batch.id}/organization`;
  const query = `?offset=${offset}&attention=${attention}`;
  useEffect(() => {
    const abort = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    const load = async (first = false) => {
      try {
        const value = await request<OrganizationJob | null>(base + query, undefined, abort.signal);
        if (!abort.signal.aborted && (first || !frozen.current)) { setJob(value); setError(''); }
      } catch (e) { if (!abort.signal.aborted) setError((e as Error).message); }
      if (!abort.signal.aborted) timer = setTimeout(() => void load(), 1500);
    };
    void load(true);
    return () => { abort.abort(); clearTimeout(timer); };
  }, [base, query]);
  async function act(path: string, body: unknown) {
    if (busy) return;
    setBusy(true); setError('');
    try {
      await request(path, body);
      setJob(await request<OrganizationJob | null>(base + query));
      setSelected([]); changed();
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  const running = job?.status === 'running';
  useEffect(() => { onRunningChange?.(running); return () => onRunningChange?.(false); }, [running, onRunningChange]);
  const apply = (selection: 'high' | 'selected') => job && act(`${base}-apply`, {
    expectedRevisionId: job.revisionId, expectedBatchRevisionId: batch.revisionId,
    selection, ...(selection === 'selected' ? { entryIds: selected } : {}),
  });
  return <section className="import-ai" aria-label="AI organization">
    <div className="import-ai-heading">
      <div role="status"><h3>{!job ? 'Let Counsel organize these files' : running ? 'Counsel is organizing your files' : job.status === 'complete' ? 'Organization ready to review' : job.status === 'failed' ? 'Organization needs attention' : 'AI organization paused'}</h3>
        <p>{job ? `${job.analyzed} of ${job.eligible + job.waiting} eligible files analyzed${job.skipped ? `; ${job.skipped} excluded, profile or unreadable files` : ''}. ${job.applied} suggestions applied.`
          : 'Counsel reads document excerpts, connects related files and suggests where they belong. No special folder structure needed.'}</p></div>
      <div className="import-queue-actions">
        {!job ? <button className="button" disabled={busy || !data.connection.ready} onClick={() => { try { void act(base, organizationRequest(batch, data, instruction)); } catch (e) { setError((e as Error).message); } }}>Organize with Counsel</button>
          : <>
            {job.status !== 'complete' && <button className="button" disabled={busy} onClick={() => void act(`${base}-control`, { action: running ? 'pause' : 'resume', expectedRevisionId: job.revisionId })}>{running ? 'Pause organization' : 'Resume organization'}</button>}
            <button className="button" disabled={busy || !job.analyzed || running} onClick={() => setReview(true)}>Review organization</button>
          </>}
      </div>
    </div>
    {job ? <><p className="fine-print">{job.message}</p><p className="fine-print">{job.high} clear suggestions · {job.attention} need your attention · {job.request.modelChoice.model}.{running ? ' You can leave this page while it works.' : ''}</p></>
      : <><details><summary>Add guidance (optional)</summary><textarea aria-label="Background organization guidance" rows={2} maxLength={2000} value={instruction} onChange={e => setInstruction(e.target.value)} placeholder="For example: the Acme drafts concern two separate transactions…" /></details>
        <p className="fine-print">Uses {data.connection.label}{data.connection.config ? ` · ${data.connection.config.model}` : ''}, including your plan usage. Shares up to 6,000 extracted characters per file, names, filing choices, matching matter names and earlier filing suggestions from this import. Originals stay local. Review before importing.</p></>}
    {error && <ErrorNotice message={error} />}
    {review && job && <Modal title="Review Counsel’s organization" onClose={() => setReview(false)} busy={busy}>
      <div className="record-form">
        <p>Review the proposed filing. Applying suggestions changes only staged choices; you’ll confirm the final import separately.</p>
        <div className="import-queue-actions">
          <button className="button button-primary" disabled={busy || !job.high} onClick={() => void apply('high')}>Apply {job.high} clear suggestions</button>
          <button className="button" disabled={busy || !selected.length} onClick={() => void apply('selected')}>Apply {selected.length} selected suggestions</button>
        </div>
        <label className="import-ai-toggle"><input type="checkbox" checked={attention} onChange={e => { setAttention(e.target.checked); setOffset(0); setSelected([]); }} />Show only items needing attention</label>
        <p className="fine-print">Clear suggestions have high model confidence, not guaranteed accuracy. Uncertain and edited files need review. To correct filing, edit the file in the main import list.</p>
        <div className="import-suggestions">{job.suggestions.map(item => <section className="import-suggestion" key={item.entryId}>
          <label className="import-suggestion-title"><input type="checkbox" disabled={busy || item.stale || item.applied} checked={selected.includes(item.entryId)}
            onChange={e => setSelected(value => e.target.checked ? [...value, item.entryId] : value.filter(id => id !== item.entryId))} /><span>{item.path}</span></label>
          <dl><div><dt>Current</dt><dd>{item.stale ? 'Edited after analysis; your choice is kept' : location(item.applied ? item.choice : item.before, item.sharedMatters)}</dd></div>
            <div><dt>Suggested</dt><dd>{location(item.choice, item.sharedMatters)}</dd></div></dl>
          <p>{item.reason}</p><p className="fine-print">{item.applied ? 'Applied to import choices' : item.stale ? 'Needs a fresh manual review' : `Confidence: ${item.confidence}`}{item.partial ? ' · Partial excerpt' : ''}</p>
          <details><summary>Supporting text and context</summary><blockquote>{item.evidenceQuote}</blockquote>
            <p>Candidate matters: {item.sharedMatters.map(matter => matter.title).join('; ') || 'None'}.</p>
            {!!item.sharedGroups.length && <p>Earlier proposed groups: {item.sharedGroups.map(group => group.title).join('; ')}.</p>}
          </details>
        </section>)}</div>
        {!job.total && <p>No suggestions in this view.</p>}
        <div className="import-page-controls"><button className="button" disabled={busy || offset === 0} onClick={() => { setOffset(value => Math.max(0, value - 50)); setSelected([]); }}>Previous</button>
          <span>{job.total ? `${offset + 1}–${Math.min(offset + 50, job.total)} of ${job.total}` : '0 suggestions'}</span>
          <button className="button" disabled={busy || offset + 50 >= job.total} onClick={() => { setOffset(value => value + 50); setSelected([]); }}>Next</button></div>
        {error && <ErrorNotice message={error} />}
        <div className="form-actions"><button className="button" disabled={busy} onClick={() => setReview(false)}>Back to import</button></div>
      </div>
    </Modal>}
  </section>;
}
