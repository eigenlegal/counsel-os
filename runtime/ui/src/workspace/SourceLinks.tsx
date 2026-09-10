import { useEffect, useState } from 'react';
import { href, request } from './api';
import { ErrorNotice, Modal } from './components';
import type { SourceLinkPreview } from '../../../src/workspace/source-links';

export function SourceLinksReview({ sourceId, close, changed }: { sourceId: string; close: () => void; changed: () => void }) {
  const [preview, setPreview] = useState<SourceLinkPreview | null>(null), [error, setError] = useState('');
  const [busy, setBusy] = useState(false), [offset, setOffset] = useState(0), [view, setView] = useState('sharing');
  const [reload, setReload] = useState(0), [selected, setSelected] = useState<string[]>([]), [message, setMessage] = useState('');
  useEffect(() => {
    const abort = new AbortController();
    setPreview(null); setSelected([]); setError('');
    request<SourceLinkPreview>(`/sources/${sourceId}/links?offset=${offset}&view=${view}`, undefined, abort.signal)
      .then(value => { if (!abort.signal.aborted) setPreview(value); })
      .catch(e => { if (!abort.signal.aborted) setError(e.message); });
    return () => abort.abort();
  }, [sourceId, offset, view, reload]);
  function refresh() { setPreview(null); setSelected([]); setReload(n => n + 1); }
  async function apply() {
    if (!preview || !selected.length || busy || error) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const result = await request<{ added: number }>(`/sources/${sourceId}/links`, { expectedVersion: preview.expectedVersion,
        linkIds: selected, confirmAccessChanges: true });
      setMessage(`${result.added} ${result.added === 1 ? 'matter link added' : 'matter links added'}. Originals and other filing choices are unchanged.`);
      setOffset(0); refresh(); changed();
    } catch (e) { setError((e as Error).message); setSelected([]); }
    finally { setBusy(false); }
  }
  return <Modal title="Review document links" onClose={close} busy={busy}>
    <div className="record-form source-links-review">
      <p>Connect a note’s references to documents already in your workspace, including files imported later.</p>
      {preview && <div className="source-links-origin"><strong>{preview.title}</strong>
        <p className="fine-print">{preview.path ?? 'No retained file path'}<br />{preview.matched} matched · {preview.unresolved} unresolved · {preview.shareable} possible matter links</p></div>}
      <div className="import-link-controls"><label>Show<select aria-label="Retained document link filter" disabled={busy} value={view}
        onChange={e => { setPreview(null); setSelected([]); setView(e.target.value); setOffset(0); }}>
        <option value="sharing">Possible matter links</option><option value="all">All references</option><option value="unresolved">Unresolved references</option>
      </select></label><button className="button" disabled={busy} onClick={refresh}>Check again</button></div>
      {preview?.truncated && <p role="status">This check has incomplete coverage: it reads up to 500,000 characters and 100 references per note, 10,000 matter associations and 50,000 retained file records. Unchecked links may be missing; an incomplete file inventory cannot authorize sharing.</p>}
      <div className="import-suggestions">{preview?.items.map(item => <section className="import-suggestion" key={item.id}>
        <label className="import-suggestion-title"><input type="checkbox" checked={selected.includes(item.id)} disabled={busy || !!error || !item.canShare}
          onChange={e => setSelected(ids => e.target.checked ? [...ids, item.id] : ids.filter(id => id !== item.id))} />
          <span>{item.targetTitle ?? item.href}{item.matter && <small>For {item.matter.title}</small>}</span></label>
        <p>{item.note}</p>
        {item.targetPath && <p className="fine-print">{item.targetPath}{item.crossImport ? ' · From a separate upload or import' : ''}</p>}
        {!!item.candidates.length && <ul>{item.candidates.map((path, index) => <li key={index}>{path}</li>)}</ul>}
        {item.candidateCount > item.candidates.length && item.status === 'ambiguous' && <p className="fine-print">Showing {item.candidates.length} of {item.candidateCount} matching paths.</p>}
        <details><summary>Reference in the note</summary><blockquote>{item.quote}</blockquote></details>
        {item.targetId && <a href={href('references', { id: item.targetId, revision: item.targetRevisionId! })} onClick={close}>Open matched document</a>}
      </section>)}</div>
      {!preview && !error && <p role="status">Checking retained documents…</p>}
      {preview && !preview.items.length && <p role="status">{view === 'sharing' ? 'No matter links to add in this view. Choose All references to see unresolved or already linked documents.' : 'No references in this view.'}</p>}
      {preview && (offset > 0 || offset + 50 < preview.total) && <div className="library-pagination">
        <button className="button" disabled={busy || !offset} onClick={() => { setPreview(null); setOffset(n => Math.max(0, n - 50)); }}>Previous</button>
        <span>Page {offset / 50 + 1} of {Math.max(1, Math.ceil(preview.total / 50))}</span>
        <button className="button" disabled={busy || offset + 50 >= preview.total} onClick={() => { setPreview(null); setOffset(n => n + 50); }}>Next</button></div>}
      <p className="fine-print">Adding a link makes that document available to chats in the named matter now. It does not merge matters or create clients, signing entities or practice standards. Remove links later from the document’s Matters section. No external files are fetched.</p>
      {message && <p role="status">{message}</p>}
      {error && <ErrorNotice message={error} retry={refresh} />}
      <div className="form-actions"><button className="button" disabled={busy} onClick={close}>Done</button>
        <button className="button button-primary" disabled={busy || !!error || !preview || !selected.length} onClick={apply}>Add {selected.length} {selected.length === 1 ? 'matter link' : 'matter links'}</button></div>
    </div>
  </Modal>;
}

export function SourceLinks({ sourceId, changed }: { sourceId: string; changed: () => void }) {
  const [open, setOpen] = useState(false);
  return <section><h2>Referenced documents</h2><p className="fine-print">Check this note’s links against retained workspace files, including later imports.</p>
    <button className="button" onClick={() => setOpen(true)}>Review document links</button>
    {open && <SourceLinksReview sourceId={sourceId} close={() => setOpen(false)} changed={changed} />}</section>;
}
