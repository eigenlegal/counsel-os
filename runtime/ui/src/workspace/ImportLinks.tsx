import { useEffect, useState } from 'react';
import { request } from './api';
import { ErrorNotice, Modal } from './components';
import type { ImportBatch } from '../../../src/workspace/import-types';
import type { ImportLinkPreview } from '../../../src/workspace/import-links';

export function ImportLinks({ batch, organizing, changed }: { batch: ImportBatch; organizing: boolean; changed: () => void }) {
  const [preview, setPreview] = useState<ImportLinkPreview | null>(null), [error, setError] = useState('');
  const [open, setOpen] = useState(false), [busy, setBusy] = useState(false), [offset, setOffset] = useState(0);
  const [view, setView] = useState('all'), [reload, setReload] = useState(0), [selected, setSelected] = useState<string[]>([]);
  const waiting = !!(batch.progress.awaitingUpload || batch.progress.queued || batch.progress.processing);
  useEffect(() => {
    if (waiting) return;
    const abort = new AbortController();
    request<ImportLinkPreview>(`/imports/${batch.id}/links?offset=${offset}&view=${view}`, undefined, abort.signal)
      .then(value => { if (!abort.signal.aborted) { setPreview(value); setSelected([]); setError(''); } })
      .catch(e => { if (!abort.signal.aborted) setError(e.message); });
    return () => abort.abort();
  }, [batch.id, batch.revisionId, waiting, offset, view, reload]);
  async function apply() {
    if (busy || !preview || !selected.length) return;
    setBusy(true); setError('');
    try {
      await request(`/imports/${batch.id}/links`, { expectedRevisionId: preview.revisionId, expectedVersion: preview.expectedVersion,
        linkIds: selected, confirmAccessChanges: true });
      setSelected([]); setReload(value => value + 1); changed();
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  if (waiting) return null;
  return <section className="import-links" aria-label="Linked documents">
    <div className="import-ai-heading"><div><h3>Linked documents</h3>
      <p>{preview ? `${preview.matched} references matched · ${preview.unresolved} unresolved · ${preview.shareable} possible matter links`
        : 'Checking references within your selected files…'}</p></div>
      <button className="button" disabled={!preview || busy} onClick={() => setOpen(true)}>Review document links</button></div>
    <p className="fine-print">Local check of Markdown and text notes. Files outside this selection are never fetched. Finding a reference does not grant a chat access.</p>
    {error && !open && <ErrorNotice message={error} retry={() => setReload(value => value + 1)} />}
    {open && preview && <Modal title="Review linked documents" onClose={() => setOpen(false)} busy={busy}>
      <div className="record-form">
        <p>A note can point to supporting documents in another folder. Choose the files its matter should be able to use. This adds sharing to import choices; it does not merge matters or change the originals.</p>
        <p className="fine-print">Checked {preview.scannedFiles} Markdown/text notes. {preview.omittedFiles} other, excluded or unreadable files were not scanned for outgoing links; included files can still be matched as targets.
          {preview.truncated && ' Coverage is limited: up to 1,000 notes, 20 MB of extracted data, 100 references per note and 10,000 references per import. Other links may be missing from this review.'}</p>
        <div className="import-link-controls"><label>Show<select aria-label="Document link filter" disabled={busy} value={view} onChange={e => { setView(e.target.value); setOffset(0); setSelected([]); }}>
          <option value="all">All references</option><option value="sharing">Possible matter links</option><option value="unresolved">Unresolved references</option>
        </select></label><button className="button" disabled={busy} onClick={() => setReload(value => value + 1)}>Check again</button></div>
        {organizing && <p className="fine-print">Pause AI organization before changing matter links. Applied filing choices determine which matter each note belongs to.</p>}
        <div className="import-suggestions">{preview.items.map(item => <section className="import-suggestion" key={item.id}>
          <label className="import-suggestion-title"><input type="checkbox" disabled={!item.canShare || busy || organizing} checked={selected.includes(item.id)}
            onChange={e => setSelected(value => e.target.checked ? [...value, item.id] : value.filter(id => id !== item.id))} />
            <span>{item.fromPath} → {item.targetPath ?? item.href}</span></label>
          <p>{item.note}</p>
          {item.matter && <p className="fine-print">Referring note’s matter: {item.matter.title}</p>}
          {!!item.candidates.length && <ul>{item.candidates.map(path => <li key={path}>{path}</li>)}</ul>}
          {item.candidateCount > item.candidates.length && item.status === 'ambiguous' && <p className="fine-print">Showing {item.candidates.length} of {item.candidateCount} matching paths. Nothing selected automatically.</p>}
          <details><summary>Original reference</summary><blockquote>{item.quote}</blockquote></details>
        </section>)}</div>
        {!preview.items.length && <p>No references in this view. This check does not infer relationships that are not explicitly linked.</p>}
        <div className="import-page-controls"><button className="button" disabled={busy || !offset} onClick={() => setOffset(value => Math.max(0, value - 50))}>Previous</button>
          <span>{preview.total ? `${offset + 1}–${Math.min(offset + 50, preview.total)} of ${preview.total}` : '0 references'}</span>
          <button className="button" disabled={busy || offset + 50 >= preview.total} onClick={() => setOffset(value => value + 50)}>Next</button></div>
        <p className="fine-print">Selected documents become available to those matter chats only after you confirm the final import. Other matter links remain unchanged; no practice baseline, client or signing entity is created.</p>
        {error && <ErrorNotice message={error} />}
        <div className="form-actions"><button className="button" disabled={busy} onClick={() => setOpen(false)}>Back to import</button>
          <button className="button button-primary" disabled={busy || organizing || !selected.length} onClick={() => void apply()}>Add {selected.length} {selected.length === 1 ? 'link' : 'links'} to import choices</button></div>
      </div>
    </Modal>}
  </section>;
}
