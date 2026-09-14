import { useEffect, useState } from 'react';
import { request } from './api';
import { ErrorNotice, Modal } from './components';
import { startDraftChat } from './chat-handoff';
import type { PracticeSourcePage } from '../../../src/workspace/practice-intake';

export const PRACTICE_IMPORT_PROMPT = 'Please read these attached files and incorporate the relevant information into my practice document for future work. Preserve unrelated existing preferences and all meaningful instructions. Resolve clearly stated identity and Word output preferences, and ask about genuine conflicts or missing attribution. Explain what Counsel can apply, what it handles natively, and any external workflows it cannot execute. Show me one proposed update before saving.';

/** File selection is explicit, including when local or AI discovery suggests it.
 * No provider calls, profile activation or source rewriting occur on opening. */
export function PracticeSources({ batch, close, started }: { batch?: string; close: () => void; started?: () => void }) {
  const [page, setPage] = useState<PracticeSourcePage | null>(null), [query, setQuery] = useState(''), [all, setAll] = useState(false);
  const [offset, setOffset] = useState(0), [selected, setSelected] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  useEffect(() => {
    const abort = new AbortController(); setPage(null); setError('');
    const timer = setTimeout(() => {
      const params = new URLSearchParams({ query, all: String(all), offset: String(offset), ...(batch ? { batch } : {}) });
      request<PracticeSourcePage>(`/practice-document/sources?${params}`, undefined, abort.signal).then(setPage).catch(e => { if (!abort.signal.aborted) setError(e.message); });
    }, 150);
    return () => { clearTimeout(timer); abort.abort(); };
  }, [batch, query, all, offset]);
  const ids = Object.keys(selected);
  return <Modal title="Bring your instructions into chat" onClose={close} busy={busy}>
    <div className="record-form practice-source-picker">
      <p>Choose the files that describe you or how you work. Counsel will read them when you send the chat, then propose one update for your confirmation.</p>
      <label>Find saved instructions<input value={query} placeholder="Search filenames or saved text…" onChange={event => { setQuery(event.target.value); setOffset(0); }} /></label>
      <label className="checkbox-label"><input type="checkbox" checked={all} onChange={event => { setAll(event.target.checked); setOffset(0); }} />Show all readable files{batch ? ' from this import' : ''}</label>
      <p className="fine-print">Suggestions use file content as well as names; they may miss a file. Search or show all files to choose your own. Select up to 12 at a time. Nothing is applied automatically.</p>
      {!!ids.length && <div className="practice-source-selection" aria-label="Selected instruction files">{ids.map(id => <button className="button button-quiet" key={id} onClick={() => setSelected(current => { const next = { ...current }; delete next[id]; return next; })}>Remove {selected[id]}</button>)}</div>}
      {!page && !error && <p role="status">Finding saved files…</p>}
      {page && <><div className="practice-source-list">{page.items.map(file => <label className="practice-source-row" key={file.revisionId}>
        <input type="checkbox" checked={!!selected[file.revisionId]} disabled={busy || (!selected[file.revisionId] && ids.length >= 12)} onChange={event => setSelected(current => {
          const next = { ...current }; if (event.target.checked) next[file.revisionId] = file.title; else delete next[file.revisionId]; return next;
        })} /><span><strong>{file.title}</strong><small>{file.reason}{file.partial ? ' Only extracted text is available; review its coverage.' : ''}</small></span>
      </label>)}</div>
        {!page.items.length && <p>No suggestions on this page. Try a word from the file, show all readable files, or check the next page.</p>}
        <div className="practice-source-pages"><span>{ids.length} selected</span><button className="button" disabled={!offset} onClick={() => setOffset(Math.max(0, offset - 200))}>Previous files</button><button className="button" disabled={page.nextOffset === null} onClick={() => setOffset(page.nextOffset!)}>Next files</button></div></>}
      {error && <ErrorNotice message={error} />}
      <div className="dialog-actions"><button className="button" disabled={busy} onClick={close}>Cancel</button><button className="button button-primary" disabled={busy || !ids.length} onClick={async () => {
        setBusy(true); setError(''); try { await startDraftChat(PRACTICE_IMPORT_PROMPT, ids); close(); started?.(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
      }}>{busy ? 'Preparing chat…' : 'Continue in chat'}</button></div>
    </div>
  </Modal>;
}
