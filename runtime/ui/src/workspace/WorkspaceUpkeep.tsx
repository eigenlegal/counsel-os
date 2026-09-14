import { useEffect, useState } from 'react';
import { href, request, type Snapshot } from './api';
import { ErrorNotice, Modal } from './components';
import { SourceOrganization } from './SourceOrganization';
import { SourceLinksReview } from './SourceLinks';
import { AutoFiling } from './AutoFiling';
import type { UpkeepFinding, UpkeepStatus } from '../../../src/workspace/upkeep-types';

const names = { unfiled: 'Choose a location', partial: 'Incomplete readable text', 'source-links': 'Referenced workspace documents', 'import-review': 'Unfinished import', 'import-links': 'Linked documents' };
const date = (value: string) => new Date(value).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

export function WorkspaceUpkeep({ data }: { data: Snapshot }) {
  const [open, setOpen] = useState(false), [view, setView] = useState<'attention' | 'dismissed'>('attention');
  const [offset, setOffset] = useState(0), [retry, setRetry] = useState(0), [busy, setBusy] = useState(false);
  const [value, setValue] = useState<UpkeepStatus | null>(null), [loadError, setLoadError] = useState(''), [error, setError] = useState('');
  const [organize, setOrganize] = useState<string[] | null>(null);
  const [links, setLinks] = useState<string | null>(null);
  useEffect(() => {
    const abort = new AbortController(); let timer: ReturnType<typeof setTimeout>;
    setValue(null);
    async function poll() {
      try {
        const next = await request<UpkeepStatus>(`/upkeep?view=${view}&offset=${offset}`, undefined, abort.signal);
        if (!abort.signal.aborted) { setValue(next); setLoadError(''); }
      } catch (e) { if (!abort.signal.aborted) setLoadError((e as Error).message); }
      if (!abort.signal.aborted) timer = setTimeout(poll, open ? 2000 : 10000);
    }
    void poll();
    return () => { abort.abort(); clearTimeout(timer); };
  }, [view, offset, retry, open]);
  async function check() {
    setBusy(true); setError('');
    try { await request('/upkeep/check', {}); setRetry(n => n + 1); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  async function decide(item: UpkeepFinding) {
    setBusy(true); setError('');
    try { await request('/upkeep/decision', { kind: item.kind, targetId: item.targetId, code: item.code,
      expectedVersion: item.version, action: view === 'attention' ? 'dismiss' : 'restore' }); setRetry(n => n + 1); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  const checking = (value?.pending ?? 0) > 0;
  return <>
    <div className="upkeep-summary">
      <div><strong>Workspace upkeep</strong><p className="fine-print">{loadError ? 'Organization checks are unavailable.' : value
        ? `${value.attention} ${value.attention === 1 ? 'item' : 'items'} to review${checking ? ` · ${value.pending} checks queued` : ''}${value.failed ? ` · ${value.failed} checks need retry` : ''}`
        : 'Checking saved activity…'}</p></div>
      <button className="button" onClick={() => { setOpen(true); setError(''); }}>Review organization</button>
    </div>
    {(data.interfaceVersion ?? 0) >= 25 && <AutoFiling data={data} />}
    {open && <Modal title="Workspace upkeep" onClose={() => setOpen(false)} busy={busy}>
      <div className="record-form upkeep-review">
        <p>While the app is open, Counsel OS checks changed records automatically, with a wider check every four hours when idle.</p>
        <details className="upkeep-explainer"><summary>What gets checked?</summary>
          <p className="fine-print">These local checks cover unfiled documents, incomplete readable text, unfinished imports and document references within staged imports and across retained workspace files. They make no AI calls and do not move files, change access or alter your practice standards. AI filing help is available for unfiled documents. Check now uses the same rules; checks wait while a response is running.</p>
        </details>
        <div className="upkeep-toolbar">
          <div className="filter-tabs" role="group" aria-label="Organization findings">
            <button className={view === 'attention' ? 'selected' : undefined} aria-pressed={view === 'attention'} onClick={() => { if (view !== 'attention' || offset) setValue(null); setView('attention'); setOffset(0); setError(''); }}>To review{value ? ` (${value.attention})` : ''}</button>
            <button className={view === 'dismissed' ? 'selected' : undefined} aria-pressed={view === 'dismissed'} onClick={() => { if (view !== 'dismissed' || offset) setValue(null); setView('dismissed'); setOffset(0); setError(''); }}>Left as is{value ? ` (${value.dismissed})` : ''}</button>
          </div>
          <button className="button" disabled={busy || checking} onClick={check}>{checking ? 'Checking…' : 'Check now'}</button>
        </div>
        <p className="fine-print">“Leave as is” hides this finding until its record changes. It does not approve, organize or delete the file.</p>
        {(loadError || error) && <ErrorNotice message={error || loadError} retry={() => { setError(''); setRetry(n => n + 1); }} />}
        {!value && !loadError && <p role="status">Loading organization check…</p>}
        {value && <>
          {value.failed > 0 && <div className="upkeep-errors" role="status"><p>{value.failed} records could not be checked. Completed checks are retained.</p>
            {value.errors.map(item => <p key={item.kind+item.targetId}><a href={href(item.kind === 'source' ? 'references' : 'imports', { id: item.targetId })} onClick={() => setOpen(false)}>Open record</a> · {item.error}</p>)}</div>}
          {!value.items.length && <p role="status">{checking ? 'Checks are in progress. Findings will appear here.' : view === 'dismissed'
            ? 'No current findings have been left as is.' : offset ? 'No more findings on this page. Return to the previous page.'
            : 'No outstanding findings from these checks. This is not a full legal or document audit.'}</p>}
          <div className="upkeep-findings">{value.items.map(item => <section className="upkeep-finding" key={`${item.kind}:${item.targetId}:${item.code}`}>
            <h3>{item.title}</h3><p className="field-help">{names[item.code]}</p><p>{item.detail}</p>
            <div className="upkeep-actions">
              <a className="button" href={href(item.kind === 'source' ? 'references' : 'imports', { id: item.targetId })} onClick={() => setOpen(false)}>{item.kind === 'source' ? 'Open file' : 'Open import'}</a>
              {item.code === 'unfiled' && view === 'attention' && <button className="button" disabled={busy} onClick={() => { setOpen(false); setOrganize([item.targetId]); }}>Suggest filing</button>}
              {item.code === 'source-links' && <button className="button" disabled={busy} onClick={() => { setOpen(false); setLinks(item.targetId); }}>Review document links</button>}
              <button className="text-button" disabled={busy} onClick={() => decide(item)}>{view === 'attention' ? 'Leave as is' : 'Return to review'}</button>
            </div>
          </section>)}</div>
          {(offset > 0 || offset + 50 < value.total) && <div className="library-pagination">
            <button className="button" disabled={!offset || busy} onClick={() => { setValue(null); setOffset(n => Math.max(0, n - 50)); }}>Previous</button>
            <span>Page {offset / 50 + 1} of {Math.max(1, Math.ceil(value.total / 50))}</span>
            <button className="button" disabled={offset + 50 >= value.total || busy} onClick={() => { setValue(null); setOffset(n => n + 50); }}>Next</button>
          </div>}
          <details className="upkeep-history"><summary>Recent checks</summary>
            {!value.history.length ? <p>The first check has not run yet.</p> : <ul>{value.history.map(run => <li key={run.id}>
              {run.reason === 'changes' ? 'Changed records' : run.reason === 'manual' ? 'Requested check' : 'Periodic check'} · {date(run.startedAt)}
              <span>{run.checked} records checked · {run.completedAt ? 'Complete' : value.failed && !checking ? 'Needs retry' : 'In progress'}</span>
            </li>)}</ul>}
          </details>
        </>}
        <div className="form-actions"><button className="button" disabled={busy} onClick={() => setOpen(false)}>Done</button></div>
      </div>
    </Modal>}
    {organize && <SourceOrganization sourceIds={organize} mode="suggest" data={data}
      close={() => { setOrganize(null); setOpen(true); setRetry(n => n + 1); }} saved={() => setRetry(n => n + 1)} />}
    {links && <SourceLinksReview sourceId={links} close={() => { setLinks(null); setOpen(true); setRetry(n => n + 1); }} changed={() => setRetry(n => n + 1)} />}
  </>;
}
