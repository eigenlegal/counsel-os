import { useEffect, useState } from 'react';
import type { ImportedStandardsPage } from '../../../src/workspace/practice-adoption';
import { request, type KnowledgeRevision, type Snapshot } from './api';
import { ErrorNotice, Modal } from './components';
import { DocumentReader } from './DocumentReader';

const roleLabels = { position: 'Position: standing guidance', method: 'Method: working guidance', language: 'Reusable language: starting text', pattern: 'Lesson or pattern: historical context' };

export function ImportedStandards({ data, close, saved, setupProfile }: {
  data: Snapshot; close: () => void; saved: (count: number) => void; setupProfile: () => void;
}) {
  const [page, setPage] = useState(0), [reload, setReload] = useState(0);
  const [value, setValue] = useState<ImportedStandardsPage | null>(null), [error, setError] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set()), [confirmed, setConfirmed] = useState(false), [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  useEffect(() => {
    const abort = new AbortController();
    setValue(null); setSelected(new Set()); setConfirmed(false); setError('');
    request<ImportedStandardsPage>(`/practice-library/imported-standards?page=${page}`, undefined, abort.signal)
      .then(result => { if (!abort.signal.aborted) setValue(result); })
      .catch(e => { if (!abort.signal.aborted) setError(e.message); });
    return () => abort.abort();
  }, [page, reload, data.profile?.revisionId]);
  function select(ids: Set<string>) { setSelected(ids); setConfirmed(false); }
  async function adopt() {
    if (busy || !data.profile || !value || !selected.size || !confirmed) return;
    setBusy(true); setError('');
    try {
      const result = await request<{ adopted: number }>('/practice-library/adopt', {
        selections: value.records.filter(item => selected.has(item.id)).map(item => ({ id: item.id, expectedRevisionId: item.revisionId })),
        expectedProfileRevisionId: data.profile.revisionId, confirm: true,
      });
      saved(result.adopted);
      setNotice(`Approved ${result.adopted} ${result.adopted === 1 ? 'item' : 'items'}. The list below shows what remains.`);
      setValue(null); setSelected(new Set()); setConfirmed(false); setPage(0); setReload(n => n + 1);
    } catch (e) {
      setError((e as Error).message); setConfirmed(false); setSelected(new Set());
    } finally { setBusy(false); }
  }
  return <Modal title="Review imported material" onClose={close} busy={busy}>
    <div className="imported-standards">
      <p>Select imported material you want Counsel OS to use in future work. Positions remain guidance, methods remain working instructions, and reusable language and lessons keep their own roles.</p>
      <p className="fine-print">Only unchanged, practice-wide imports appear here. Revised proposals and matter-specific items still need individual review. Original files and past responses stay unchanged.</p>
      {notice && <p role="status">{notice}</p>}
      {!value && !error && <p role="status">Loading imported material…</p>}
      {value && !value.records.length && <p>{value.total ? 'No items on this page. Return to the previous page to continue.' : 'No unchanged imported material remains to approve. You can review revised proposals and matter-specific items individually in the library.'}</p>}
      {!!value?.records.length && <>
        <div className="standards-selection">
          <label><input type="checkbox" checked={selected.size === value.records.length} disabled={busy}
            onChange={e => select(e.target.checked ? new Set(value.records.map(item => item.id)) : new Set())} />Select this page</label>
          <span>{selected.size} selected</span>
        </div>
        <ul className="standards-list">{value.records.map(item => <li key={item.revisionId}>
          <label className="standard-choice"><input type="checkbox" checked={selected.has(item.id)} disabled={busy}
            onChange={e => { const next = new Set(selected); if (e.target.checked) next.add(item.id); else next.delete(item.id); select(next); }} />
            <strong>{item.title}</strong></label>
          <div className="standard-copy"><p className="fine-print">{roleLabels[item.category]}</p><p>{item.preview || 'Open the saved text to review this item.'}</p>
            <StandardText revisionId={item.revisionId} title={item.title} /></div>
        </li>)}</ul>
      </>}
      {value && <div className="library-pagination"><span>{value.total} imported {value.total === 1 ? 'item' : 'items'} awaiting approval</span>
        {(page > 0 || value.hasMore) && <><button className="button" disabled={busy || !page} onClick={() => setPage(n => n - 1)}>Previous</button>
          <span>Page {page + 1}</span><button className="button" disabled={busy || !value.hasMore} onClick={() => setPage(n => n + 1)}>Next</button></>}
        {value.hasMore && <p className="fine-print">Showing {page * 50 + 1}–{page * 50 + value.records.length} of {value.total}. Approve this page to continue with the remaining items; selection does not carry to other pages.</p>}
      </div>}
    </div>
    <div className="standards-review-footer">
      {error && <ErrorNotice message={error} retry={busy ? undefined : () => setReload(n => n + 1)} />}
      {!!value?.records.length && (data.profile ? <>
        <label className="standard-confirm"><input type="checkbox" checked={confirmed} disabled={busy || !selected.size}
          onChange={e => setConfirmed(e.target.checked)} />Use the selected material in my practice.</label>
        <p className="fine-print">Approval will be recorded as {data.profile.name}.</p>
      </> : <p>Set your name before recording an approval. <button className="text-button" onClick={setupProfile}>Set up profile</button></p>)}
      <div className="form-actions"><button className="button" disabled={busy} onClick={close}>Close</button>
        {!!value?.records.length && <button className="button button-primary" disabled={busy || !data.profile || !confirmed || !selected.size} onClick={() => { void adopt(); }}>
          {busy ? 'Approving material…' : `Approve ${selected.size || ''} ${selected.size === 1 ? 'item' : 'items'}`.replace('  ', ' ')}
        </button>}</div>
    </div>
  </Modal>;
}

function StandardText({ revisionId, title }: { revisionId: string; title: string }) {
  const [open, setOpen] = useState(false), [revision, setRevision] = useState<KnowledgeRevision | null>(null), [error, setError] = useState(''), [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!open || revision) return;
    const abort = new AbortController(); setError('');
    request<KnowledgeRevision>(`/knowledge-revisions/${revisionId}`, undefined, abort.signal)
      .then(value => { if (!abort.signal.aborted) setRevision(value); })
      .catch(e => { if (!abort.signal.aborted) setError(e.message); });
    return () => abort.abort();
  }, [open, revisionId, revision, retry]);
  return <div className="standard-text"><button className="text-button" aria-expanded={open} aria-label={`${open ? 'Hide' : 'Read'} ${title}`} onClick={() => setOpen(!open)}>{open ? 'Hide text' : 'Read material'}</button>
    {open && (error ? <ErrorNotice message={error} retry={() => setRetry(n => n + 1)} /> : revision ? <DocumentReader text={revision.body} markdown /> : <p role="status">Loading saved text…</p>)}
  </div>;
}
