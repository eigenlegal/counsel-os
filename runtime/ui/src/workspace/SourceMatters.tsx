import { useEffect, useState } from 'react';
import { href, request, type Snapshot } from './api';
import type { SourceMatters as Links } from '../../../src/workspace/source-matters';
import { Modal, ErrorNotice } from './components';
import { MatterPicker } from './MatterPicker';
import { Icon } from './icons';

export function SourceMatters({ sourceId, data, changed }: { sourceId: string; data: Snapshot; changed: () => void }) {
  const [links, setLinks] = useState<Links | null>(null);
  const [error, setError] = useState(''), [busy, setBusy] = useState(false), [retry, setRetry] = useState(0);
  const [action, setAction] = useState<{ kind: 'link' | 'unlink'; matterId: string; title?: string } | null>(null);
  useEffect(() => {
    const abort = new AbortController();
    request<Links>(`/sources/${sourceId}/matters`, undefined, abort.signal)
      .then(next => { if (!abort.signal.aborted) { setLinks(next); setError(''); } })
      .catch(e => { if (!abort.signal.aborted) setError(e.message); });
    return () => abort.abort();
  }, [sourceId, retry]);
  async function apply() {
    if (!action || !links || busy) return;
    setBusy(true); setError('');
    try {
      const next = await request<Links>(`/sources/${sourceId}/matters`, {
        action: action.kind, matterId: action.matterId, expectedVersion: links.version, confirm: true,
      });
      setLinks(next); setAction(null); changed();
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  return <section className="source-matters" aria-label="Document matters">
    <h2>Matters</h2>
    <p className="fine-print">One workspace document can belong to several matters.</p>
    {links?.matters.length ? <ul>{links.matters.map(matter => <li key={matter.id}>
      <a href={href('matters', { id: matter.id })}><Icon name="matter" size={16} /><span>{matter.title}</span></a>
      <button className="icon-button" aria-label={`Remove from ${matter.title}`} onClick={() => { setError(''); setAction({ kind: 'unlink', matterId: matter.id, title: matter.title }); }}><Icon name="close" size={14} /></button>
    </li>)}</ul> : <p className="aside-empty">{links ? 'Not linked to a matter.' : 'Loading linked matters…'}</p>}
    <button className="button" disabled={!links} onClick={() => { setError(''); setAction({ kind: 'link', matterId: '' }); }}><Icon name="plus" size={15} />Add to a matter</button>
    {error && !action && <ErrorNotice message={error} retry={() => setRetry(n => n + 1)} />}
    {action && <Modal title={action.kind === 'link' ? 'Add document to a matter' : 'Remove document from matter'} onClose={() => { if (!busy) setAction(null); }} busy={busy}>
      <form className="record-form" onSubmit={event => { event.preventDefault(); void apply(); }}>
        {action.kind === 'link' ? <>
          <p>This makes the document available to chats working within the selected matter. Other matter links and library placement stay unchanged.</p>
          <label>Matter<MatterPicker value={action.matterId} onChange={matterId => setAction({ ...action, matterId })} matters={data.matters} disabled={busy} /></label>
          {links?.matters.some(matter => matter.id === action.matterId) && <p>This document is already linked to that matter.</p>}
        </> : <>
          <p>Remove this document from <strong>{action.title}</strong>?</p>
          <p>The workspace copy and its other matter links will remain. Chats where it was explicitly attached, existing citations and earlier responses keep their context. This does not delete a file from your computer.</p>
        </>}
        {error && <ErrorNotice message={error} />}
        <div className="form-actions"><button type="button" className="button button-quiet" disabled={busy} onClick={() => setAction(null)}>Cancel</button>
          <button className="button button-primary" disabled={busy || !action.matterId || (action.kind === 'link' && links?.matters.some(m => m.id === action.matterId))}>{busy ? 'Saving…' : action.kind === 'link' ? 'Add to matter' : 'Remove from matter'}</button></div>
      </form>
    </Modal>}
  </section>;
}
