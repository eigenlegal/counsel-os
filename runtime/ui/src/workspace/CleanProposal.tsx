import { useEffect, useState } from 'react';
import { downloadWord, request, type WordExport } from './api';
import { ErrorNotice, Modal } from './components';

export function CleanProposalButton({ redline }: { redline: WordExport }): JSX.Element {
  const [open, setOpen] = useState(false);
  return <><button className="button" onClick={() => setOpen(true)}>Clean proposal…</button>
    {open && <CleanProposalDialog key={redline.id} redline={redline} close={() => setOpen(false)} />}</>;
}
function CleanProposalDialog({ redline, close }: { redline: WordExport; close: () => void }): JSX.Element {
  const [file, setFile] = useState<WordExport | null>(null), [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [retry, setRetry] = useState(0);
  const path = `/exports/${redline.id}/clean-proposal`;
  useEffect(() => {
    const abort = new AbortController(); setLoading(true); setError('');
    request<WordExport | null>(path, undefined, abort.signal).then(value => { if (!abort.signal.aborted) setFile(value); })
      .catch(error => { if (!abort.signal.aborted) setError((error as Error).message); })
      .finally(() => { if (!abort.signal.aborted) setLoading(false); });
    return () => abort.abort();
  }, [path, retry]);
  async function create() {
    if (busy || loading) return;
    setBusy(true); setError('');
    try { setFile(await request<WordExport>(path, { expectedContentHash: redline.contentHash, confirmProposal: true })); }
    catch (error) { setError((error as Error).message); }
    finally { setBusy(false); }
  }
  async function download() {
    if (!file || busy) return;
    setBusy(true); setError('');
    try { await downloadWord(file.id, file.name); }
    catch (error) { setError((error as Error).message); }
    finally { setBusy(false); }
  }
  return <Modal title={file ? 'Clean proposal ready' : 'Create a clean proposal'} onClose={close} busy={busy}>
    <div className="record-form">
      {file ? <p>Saved alongside <strong>{redline.name}</strong>. Both files remain available.</p> : <>
        <p>Apply the changes from <strong>{redline.name}</strong> in a separate Word copy. Your original and tracked redline stay unchanged.</p>
        <p>Comments, including drafting rationale, are retained. This does not mark the agreement as accepted, approved or signed.</p>
        <p className="fine-print">Available when the original had no earlier tracked revisions. If it did, resolve those explicitly in Word before requesting a new redline.</p>
      </>}
      {loading && <p role="status">Checking saved files…</p>}
      {file && <><p role="status"><strong>{file.name}</strong></p><ul>{file.warnings.map(note => <li key={note}>{note}</li>)}</ul></>}
      {error && <ErrorNotice message={error} retry={() => setRetry(n => n + 1)} />}
      <div className="form-actions"><button className="button" disabled={busy} onClick={close}>{file ? 'Close' : 'Cancel'}</button>
        {file ? <button className="button button-primary" disabled={busy} onClick={download}>{busy ? 'Downloading…' : 'Download clean proposal'}</button>
          : <button className="button button-primary" disabled={busy || loading || !!error} onClick={create}>{busy ? 'Preparing…' : 'Create clean proposal'}</button>}
      </div>
    </div>
  </Modal>;
}
