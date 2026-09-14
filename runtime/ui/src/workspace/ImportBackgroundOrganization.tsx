import { useEffect, useRef, useState } from 'react';
import { request, type Snapshot } from './api';
import type { ImportBatch, ImportChoice } from '../../../src/workspace/import-types';
import type { OrganizationJob } from '../../../src/workspace/import-organization-job-types';
import { ErrorNotice, Modal } from './components';
import { ImportFilingPreview } from './ImportFilingPreview';

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

export type ImportOrganizationState = OrganizationJob['status'] | 'none' | 'checking' | 'unavailable';
export function ImportBackgroundOrganization({ batch, data, changed, onStateChange }: { batch: ImportBatch; data: Snapshot; changed: () => void; onStateChange?: (state: ImportOrganizationState) => void }) {
  const [job, setJob] = useState<OrganizationJob | null>(null), [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false), [unavailable, setUnavailable] = useState(false);
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
        if (!abort.signal.aborted && (first || !frozen.current)) { setJob(value); setLoaded(true); setUnavailable(false); setError(''); }
      } catch (e) { if (!abort.signal.aborted) { setUnavailable(true); setError((e as Error).message); } }
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
      setJob(await request<OrganizationJob | null>(base + query)); setLoaded(true); setUnavailable(false);
      setSelected([]); changed();
    } catch (e) { setUnavailable(true); setError((e as Error).message); }
    finally { setBusy(false); }
  }
  const running = job?.status === 'running';
  const state: ImportOrganizationState = unavailable ? 'unavailable' : !loaded || busy ? 'checking' : job?.status ?? 'none';
  useEffect(() => { onStateChange?.(state); }, [state, onStateChange]);
  const total = job ? job.eligible + job.waiting : 0;
  const processed = job ? job.analyzed + (job.failed ?? 0) + (job.reviewed ?? 0) : 0;
  const apply = (selection: 'high' | 'selected' | 'unfiled') => job && act(`${base}-apply`, {
    expectedRevisionId: job.revisionId, expectedBatchRevisionId: batch.revisionId,
    selection, ...(selection === 'selected' ? { entryIds: selected } : {}),
  });
  return <section className={`import-ai ${running ? 'import-ai-running' : ''}`} aria-label="AI organization">
    <div className="import-ai-heading">
      <div role="status"><h3>{unavailable ? 'Checking organization status' : !loaded ? 'Checking for saved organization…' : !job ? 'Let Counsel OS organize these files' : running ? 'Counsel OS is organizing your files' : job.status === 'complete' ? 'Organization ready to review' : job.status === 'failed' ? 'Organization needs attention' : 'AI organization paused'}</h3>
        <p>{job ? `${processed} of ${total} eligible files processed${job.skipped ? `; ${job.skipped} excluded, profile or unreadable files` : ''}.`
          : 'Counsel OS reads document excerpts, connects related files and suggests where they belong. No special folder structure needed.'}</p></div>
      <div className="import-queue-actions">
        {!job ? <button className="button" disabled={busy || !loaded || unavailable || !data.connection.ready} onClick={() => { try { void act(base, organizationRequest(batch, data, instruction)); } catch (e) { setError((e as Error).message); } }}>Organize with Counsel OS</button>
          : <>
            {job.status !== 'complete' && <button className="button" disabled={busy || unavailable} onClick={() => void act(`${base}-control`, { action: running ? 'pause' : 'resume', expectedRevisionId: job.revisionId })}>{running ? 'Pause and review manually' : 'Resume organization'}</button>}
            {!running && <button className="button" disabled={busy || unavailable || !job.total} onClick={() => { setAttention(job.attention > 0); setOffset(0); setReview(true); }}>{job.attention ? `Review ${job.attention} ${job.attention === 1 ? 'exception' : 'exceptions'}` : 'View filing details'}</button>}
          </>}
      </div>
    </div>
    {job ? <>
      {running && <progress className="import-ai-progress" aria-label="Files analyzed for organization" max={Math.max(1, total)} value={processed} />}
      <p className="import-ai-next">{unavailable ? 'Reconnecting to saved progress. File editing stays paused until the current status is available.' : running
        ? 'You don’t need to do anything yet. Clear filing choices appear automatically below. A file that needs another look won’t hold up the rest. You can work elsewhere; progress is saved.'
        : job.status === 'complete' ? 'Clear choices are already prepared. Review any exceptions, then confirm the import. You don’t need to organize every file in the list.'
          : 'Your prepared choices are kept. Resume to continue unfinished files, or pause here and review the import manually.'}</p>
      <p className="fine-print">{job.applied} filing choices prepared · {job.attention} need review · {job.remaining ?? Math.max(0, total - processed)} remaining</p>
      {!!job.retrying && <p className="fine-print">{job.retrying} {job.retrying === 1 ? 'file will get' : 'files will get'} one separate retry after the other files are processed.</p>}
      {!!job.failed && <p className="fine-print">{job.failed} {job.failed === 1 ? 'file could' : 'files could'} not be organized after a retry. The originals are kept; review their location or leave them unfiled.</p>}
      {job.status === 'failed' && <p role="alert">{job.message}</p>}
      <details className="import-ai-details"><summary>Processing details</summary><p className="fine-print">{job.message}</p><p className="fine-print">Using {job.request.modelChoice.model}. Progress is saved locally. You can use other pages while Counsel OS is running. If you quit the app, resume organization when you reopen it.</p></details>
      {job.summary && <ImportFilingPreview summary={job.summary} />}
    </>
      : <><details><summary>Add guidance (optional)</summary><textarea aria-label="Background organization guidance" rows={2} maxLength={2000} value={instruction} onChange={e => setInstruction(e.target.value)} placeholder="For example: the Acme drafts concern two separate transactions…" /></details>
        <p className="fine-print">{data.connection.ready ? <>Uses {data.connection.label}{data.connection.config ? ` · ${data.connection.config.model}` : ''}, including your plan usage. Shares up to 6,000 extracted characters per file, names, filing choices, matching matter names and earlier filing suggestions from this import. Originals stay local. Review before importing.</>
          : 'Connect AI in Settings for organization help, or review and organize files manually below.'}</p></>}
    {error && <ErrorNotice message={error} />}
    {review && job && <Modal title="Review Counsel OS’s organization" onClose={() => setReview(false)} busy={busy}>
      <div className="record-form">
        <p>Clear filing choices are already prepared. Review exceptions here, or leave them unfiled for later. Nothing enters your workspace until you confirm the import.</p>
        <div className="import-queue-actions">
          {job.high > 0 && <button className="button" disabled={busy} onClick={() => void apply('high')}>Prepare {job.high} retained suggestions</button>}
          <button className="button button-primary" disabled={busy || !selected.length} onClick={() => void apply('selected')}>Use {selected.length} selected suggestions</button>
          {job.attention > 0 && <button className="button" disabled={busy} onClick={() => void apply('unfiled')}>Leave {job.attention} {job.attention === 1 ? 'exception' : 'exceptions'} unfiled</button>}
        </div>
        <label className="import-ai-toggle"><input type="checkbox" checked={attention} onChange={e => { setAttention(e.target.checked); setOffset(0); setSelected([]); }} />Show only items needing attention</label>
        <p className="fine-print">Clear suggestions have high model confidence, not guaranteed accuracy. Uncertain and edited files need review. To correct filing, edit the file in the main import list.</p>
        <div className="import-suggestions">{job.suggestions.map(item => <section className="import-suggestion" key={item.entryId}>
          <label className="import-suggestion-title"><input type="checkbox" disabled={busy || item.stale || item.applied || item.reviewed} checked={selected.includes(item.entryId)}
            onChange={e => setSelected(value => e.target.checked ? [...value, item.entryId] : value.filter(id => id !== item.entryId))} /><span>{item.path}</span></label>
          <dl><div><dt>Current</dt><dd>{item.stale ? 'Edited after analysis; your choice is kept' : location(item.applied ? item.choice : item.before, item.sharedMatters)}</dd></div>
            <div><dt>Suggested</dt><dd>{location(item.choice, item.sharedMatters)}</dd></div></dl>
          <p>{item.reason}</p><p className="fine-print">{item.reviewed ? 'Your reviewed choice is kept' : item.applied ? 'Prepared in import preview' : item.stale ? 'Needs a fresh manual review' : `Confidence: ${item.confidence}`}{item.partial ? ' · Partial excerpt' : ''}</p>
          <details><summary>Supporting text and context</summary><blockquote>{item.evidenceQuote}</blockquote>
            <p>Candidate matters: {item.sharedMatters.map(matter => matter.title).join('; ') || 'None'}.</p>
            {!!item.sharedGroups.length && <p>Earlier proposed groups: {item.sharedGroups.map(group => group.title).join('; ')}.</p>}
          </details>
        </section>)}
        {job.failures?.map(item => <section className="import-suggestion" key={item.entryId}>
          <h3>{item.path}</h3><p>{item.reason}</p><p className="fine-print">{item.attempts < 2 ? 'One separate retry is pending.' : 'The retry also failed. The original is kept. No AI filing suggestion was applied.'}</p>
          <p>Current location: {location(item.before, [])}. Leave exceptions unfiled above, or correct this file in the full file list.</p>
        </section>)}
        </div>
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
