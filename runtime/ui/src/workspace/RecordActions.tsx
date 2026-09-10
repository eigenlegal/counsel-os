import { useEffect, useState } from 'react';
import type { ManagedRecord, RecordImpact } from '../../../src/workspace/record-lifecycle';
import { href, request } from './api';
import { ErrorNotice, Modal } from './components';
import { Icon } from './icons';

export function RecordActions({ kind, id, trashed = false, changed }: { kind: ManagedRecord; id: string; trashed?: boolean; changed: () => void }) {
  const [open, setOpen] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [impact, setImpact] = useState<RecordImpact | null>(null);
  useEffect(() => {
    if (!open) return;
    const abort = new AbortController(); setImpact(null); setError('');
    request<RecordImpact>(`/${kind === 'source' ? 'sources' : 'work'}/${id}/impact`, undefined, abort.signal)
      .then(value => { if (!abort.signal.aborted) setImpact(value); })
      .catch(e => { if (!abort.signal.aborted) setError(e.message); });
    return () => abort.abort();
  }, [open, id, kind]);
  async function apply() {
    if (!impact || busy) return;
    setBusy(true); setError('');
    try {
      await request(`/${kind === 'source' ? 'sources' : 'work'}/${id}/manage`, {
        action: trashed ? 'restore' : 'trash', expectedVersion: impact.version, confirm: true,
      });
      setOpen(false); changed();
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  const title = trashed ? 'Restore from Trash' : kind === 'source' ? 'Move document to Trash' : 'Move saved output to Trash';
  return <>
    <button className={`button ${trashed ? 'button-primary' : ''}`} onClick={() => setOpen(true)}><Icon name={trashed ? 'back' : 'trash'} size={15} />{trashed ? 'Restore' : 'Move to Trash'}</button>
    {open && <Modal title={title} onClose={() => setOpen(false)} busy={busy}>
      <form className="record-form" onSubmit={event => { event.preventDefault(); void apply(); }}>
        {impact ? <>
          <p className="conversation-management-title">{impact.title}</p>
          {trashed ? <p>Restore this {kind === 'source' ? 'document' : 'output'} to its previous locations and make it available for future retrieval again. Existing matter links and versions are preserved.</p> : <>
            <p>{kind === 'source' ? 'All versions of this document will leave active libraries and new document retrieval. Any template using it will be unavailable until you restore the document.' : 'This saved record and its generated Word files will leave saved outputs and new work-record retrieval.'}</p>
            {impact.fileCount > 0 && <p className="fine-print">{impact.fileCount} retained {kind === 'source' ? 'original file versions' : 'Word files'} will move to Trash with it.</p>}
            {impact.retained.length > 0 && <section className="conversation-retained" aria-label="Related records that remain">
              <h3>These records will remain</h3>
              <ul>{impact.retained.map(item => <li key={`${item.kind}:${item.id}`}>
                <a href={item.kind === 'template' ? href('knowledge', { section: 'templates' }) : href(item.kind === 'conversation' ? 'home' : item.kind === 'matter' ? 'matters' : item.kind === 'knowledge' ? 'knowledge' : 'work', { id: item.id })} onClick={() => setOpen(false)}>
                  <span>{item.title}<small>{item.kind === 'conversation' ? 'Conversation and existing messages' : item.kind === 'matter' ? 'Matter and applied notes' : item.kind === 'template' ? 'Template record — unavailable while document is in Trash' : item.kind === 'knowledge' ? 'Separate Practice material' : 'Existing work and its cited excerpts'}</small></span>
                </a>
              </li>)}</ul>
            </section>}
            <p className="fine-print">Existing messages, quoted excerpts and separate Practice material are not erased or undone and may still be used as context. Backups and original files outside this workspace stay unchanged. Trash is recoverable storage, not permanent erasure.</p>
          </>}
          {impact.inUse && <p role="alert">A response is using this record. Stop that response or wait for it to finish, then reopen this action.</p>}
        </> : !error && <p role="status">Checking this record and its connections…</p>}
        {error && <ErrorNotice message={error} />}
        <div className="form-actions"><button type="button" className="button button-quiet" disabled={busy} onClick={() => setOpen(false)}>Cancel</button>
          <button className={`button ${trashed ? 'button-primary' : 'button-danger'}`} disabled={busy || !impact || impact.inUse}>{busy ? 'Saving…' : trashed ? 'Restore record' : 'Move to Trash'}</button></div>
      </form>
    </Modal>}
  </>;
}
