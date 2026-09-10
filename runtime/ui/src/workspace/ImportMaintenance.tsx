import { useEffect, useState } from 'react';
import { href, request } from './api';
import { ErrorNotice, Modal } from './components';
import type { ImportDuplicates, ImportUndoPreview } from '../../../src/workspace/import-maintenance';

export function ImportMaintenance({ batchId, mode, close, saved }: {
  batchId: string; mode: 'duplicates' | 'undo'; close: () => void; saved: () => void;
}): JSX.Element {
  const [data, setData] = useState<ImportDuplicates | ImportUndoPreview | null>(null);
  const [selected, setSelected] = useState<string[]>([]), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const [page, setPage] = useState(0), [retry, setRetry] = useState(0);
  const [requestId] = useState(() => crypto.randomUUID());
  useEffect(() => {
    const abort = new AbortController(); setData(null); setError(''); setSelected([]); setPage(0);
    request<ImportDuplicates | ImportUndoPreview>(`/imports/${batchId}/${mode}`, undefined, abort.signal)
      .then(value => { if (!abort.signal.aborted) setData(value); })
      .catch(e => { if (!abort.signal.aborted) setError((e as Error).message); });
    return () => abort.abort();
  }, [batchId, mode, retry]);
  const eligible = data?.items.filter(item => !('canUndo' in item) || item.canUndo).map(item => item.entryId) ?? [];
  const undone = data && 'undone' in data && !!data.undone;
  async function apply() {
    if (!data || busy || !selected.length) return;
    setBusy(true); setError('');
    try {
      await request(`/imports/${batchId}/${mode}`, { expectedVersion: data.expectedVersion, entryIds: selected,
        ...(mode === 'undo' ? { requestId } : {}) });
      saved();
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  return <Modal title={mode === 'duplicates' ? 'Files already in your workspace' : 'Undo unused import additions'} onClose={close} busy={busy}>
    <div className="record-form">
    <p>{mode === 'duplicates'
      ? 'These files match the original bytes of an active saved version, even if renamed. Choose which incoming copies to skip. Existing files, matter links, placement and practice items stay unchanged; extraction quality may differ.'
      : 'Only unused, unchanged additions can be undone here. Originals move to Trash, unreviewed practice items move to Not adopted, and imported templates stop being offered. Original files and version history are retained.'}</p>
    {mode === 'undo' && <p>Matters, your profile and working preferences are kept. Changed, adopted, cited or shared items stay where they are. You can manage them individually.</p>}
    {error && <ErrorNotice message={error} retry={() => setRetry(n => n + 1)} />}
    {!data && !error && <p role="status">Checking saved records…</p>}
    {data && <>
      {undone ? <p role="status">Cleanup already applied. Originals can be restored from <a href={href('trash')}>Trash</a>; review practice items separately before adopting them again.</p> :
        <div className="import-maintenance-selection">
          <span>{selected.length} selected · {eligible.length} eligible</span>
          <button className="text-button" type="button" disabled={busy || !eligible.length} onClick={() => setSelected(eligible)}>Select all eligible</button>
          <button className="text-button" type="button" disabled={busy || !selected.length} onClick={() => setSelected([])}>Clear</button>
        </div>}
      {!data.items.length && <p>{mode === 'duplicates' ? 'No matching active originals found.' : 'There are no imported additions to undo.'}</p>}
      <div className="import-maintenance-list">{data.items.slice(page * 50, (page + 1) * 50).map(item => <div className="import-maintenance-item" key={item.entryId}>
        <input type="checkbox" aria-label={`Select ${'path' in item ? item.path : item.title}`} checked={selected.includes(item.entryId)}
          disabled={busy || !eligible.includes(item.entryId)} onChange={event => setSelected(values => event.target.checked ? [...values, item.entryId] : values.filter(id => id !== item.entryId))} />
        <div><strong>{'path' in item ? item.path : item.title}</strong>
          <a target="_blank" rel="noopener" href={href('references', { id: item.sourceId, ...('revisionId' in item ? { revision: item.revisionId } : {}) })}>
            {'version' in item ? `Already saved: ${item.title} · version ${item.version}` : 'Open saved file'}</a>
          {'matchingSources' in item && item.matchingSources > 1 && <small>{item.matchingSources} matching saved files; showing one.</small>}
          {'reasons' in item && item.reasons.length > 0 && <p>Kept: {item.reasons.join(' ')}</p>}
          {'practiceId' in item && item.practiceId && <small>Also withdraws the unreviewed practice item if selected.</small>}
          {'templateId' in item && item.templateId && <small>Also disables the imported template if selected.</small>}
        </div>
      </div>)}</div>
      {data.items.length > 50 && <div className="import-maintenance-selection">
        <button className="button" disabled={!page || busy} onClick={() => setPage(n => n - 1)}>Previous</button>
        <span>Page {page + 1} of {Math.ceil(data.items.length / 50)}</span>
        <button className="button" disabled={(page + 1) * 50 >= data.items.length || busy} onClick={() => setPage(n => n + 1)}>Next</button>
      </div>}
    </>}
    <div className="form-actions"><button className="button" disabled={busy} onClick={close}>Cancel</button>
      <button className="button button-primary" disabled={busy || !selected.length || !!undone} onClick={apply}>
        {busy ? 'Saving…' : mode === 'duplicates' ? `Skip ${selected.length} incoming ${selected.length === 1 ? 'copy' : 'copies'}` : `Undo ${selected.length} ${selected.length === 1 ? 'addition' : 'additions'}`}
      </button></div>
    </div>
  </Modal>;
}
