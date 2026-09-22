import { useEffect, useState } from 'react';
import type { RecordImpact } from '../../../src/workspace/record-lifecycle';
import { request, type Snapshot } from './api';
import { ErrorNotice, Modal } from './components';
import { MatterPicker } from './MatterPicker';

export function PracticeFiling({ id, data, filed }: { id: string; data: Snapshot; filed: (sourceId: string) => void }) {
  const [open, setOpen] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [impact, setImpact] = useState<RecordImpact | null>(null);
  const [destination, setDestination] = useState<'matter' | 'external' | 'practice'>('matter'), [matterId, setMatterId] = useState('');
  useEffect(() => {
    if (!open) return;
    const abort = new AbortController(); setImpact(null); setError('');
    request<RecordImpact>(`/knowledge/${id}/impact`, undefined, abort.signal)
      .then(value => { if (!abort.signal.aborted) setImpact(value); })
      .catch(e => { if (!abort.signal.aborted) setError(e.message); });
    return () => abort.abort();
  }, [open, id]);
  async function submit() {
    if (busy || !impact) return;
    setBusy(true); setError('');
    try {
      const result = await request<{ sourceId: string }>(`/knowledge/${id}/file-document`, {
        destination, matterId: destination === 'matter' ? matterId : null, expectedVersion: impact.version, confirm: true,
      });
      setOpen(false); filed(result.sourceId);
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  return <>
    <button className="button" onClick={() => setOpen(true)}>File as document</button>
    {open && <Modal title="File as document" onClose={() => setOpen(false)} busy={busy}>
      <form className="record-form" onSubmit={event => { event.preventDefault(); void submit(); }}>
        {impact ? <><p className="conversation-management-title">{impact.title}</p>
          <p>Use this for reports, matter retrospectives or reference documents that should not be reusable practice guidance.</p>
          <label>File in<select value={destination} disabled={busy} onChange={event => setDestination(event.target.value as typeof destination)}>
            <option value="matter">A matter</option><option value="external">Sources — external reference</option><option value="practice">Practice — reference document</option>
          </select></label>
          {destination === 'matter' && <label>Matter<MatterPicker value={matterId} onChange={setMatterId} matters={data.matters} disabled={busy} /></label>}
          <p>The matching original is reused when possible; otherwise the current saved text becomes a document. The practice item moves to Trash, so it is no longer supplied as practice guidance. Approval history and citations stay intact.</p>
          <p className="fine-print">A matter document is available to chats in that matter. Reference placement alone does not grant chat access. Existing original-file links and attachments remain. Restoring the practice item later does not remove the filed document.</p>
          {impact.inUse && <p role="alert">A response is using this item. Wait for it to finish, then reopen this action.</p>}
        </> : !error && <p role="status">Checking this item…</p>}
        {error && <ErrorNotice message={error} />}
        <div className="form-actions"><button type="button" className="button" disabled={busy} onClick={() => setOpen(false)}>Cancel</button>
          <button className="button button-primary" disabled={busy || !impact || impact.inUse || (destination === 'matter' && !matterId)}>{busy ? 'Filing…' : 'File document and remove guidance'}</button></div>
      </form>
    </Modal>}
  </>;
}
