import { useEffect, useRef, useState } from 'react';
import { request, type Snapshot } from './api';
import { ErrorNotice, Modal } from './components';
import { MatterPicker } from './MatterPicker';
import type { SourceOrganizationPreview, SourceOrganizationSuggestions } from '../../../src/workspace/source-organization';

export function SourceOrganization({ sourceIds, mode, data, close, saved }: {
  sourceIds: string[]; mode: 'manual' | 'suggest'; data: Snapshot; close: () => void; saved: () => void;
}): JSX.Element {
  const [preview, setPreview] = useState<SourceOrganizationPreview | null>(null), [error, setError] = useState('');
  const [busy, setBusy] = useState(false), [retry, setRetry] = useState(0), [instruction, setInstruction] = useState('');
  const [location, setLocation] = useState(''), [matter, setMatter] = useState<{ id: string; title: string } | null>(null);
  const [suggestions, setSuggestions] = useState<SourceOrganizationSuggestions | null>(null), [chosen, setChosen] = useState<string[]>([]);
  const active = useRef<AbortController | null>(null);
  useEffect(() => {
    const abort = new AbortController(); setPreview(null); setError(''); setSuggestions(null); setChosen([]);
    request<SourceOrganizationPreview>('/source-organization/preview', { sourceIds }, abort.signal)
      .then(value => { if (!abort.signal.aborted) setPreview(value); })
      .catch(error => { if (!abort.signal.aborted) setError((error as Error).message); });
    return () => { abort.abort(); active.current?.abort(); };
  }, [sourceIds, retry]);
  async function suggest() {
    const config = data.connection.config;
    if (!preview || busy || !config || !data.connection.ready) return;
    const abort = new AbortController(); active.current = abort; setBusy(true); setError('');
    try {
      const result = await request<SourceOrganizationSuggestions>('/source-organization/suggest', { sourceIds, expectedVersion: preview.expectedVersion,
        instruction, shareForSuggestions: true, modelChoice: { kind: config.kind, model: config.model, ...(config.kind === 'claude-code' ? { claudeBilling: config.claudeBilling } : {}) } }, abort.signal);
      if (!abort.signal.aborted) { setSuggestions(result); setChosen(result.suggestions.filter(item => item.target.collection !== 'unfiled' && item.confidence !== 'low').map(item => item.sourceId)); }
    } catch (error) { if (!abort.signal.aborted) setError((error as Error).message); }
    finally { if (active.current === abort) { active.current = null; setBusy(false); } }
  }
  function stop() { active.current?.abort(); active.current = null; setBusy(false); setError('Suggestions stopped. No files were changed.'); }
  async function save() {
    if (!preview || busy) return;
    setBusy(true); setError('');
    const changes = suggestions ? suggestions.suggestions.filter(item => chosen.includes(item.sourceId)).map(item => ({ sourceId: item.sourceId, target: item.target }))
      : sourceIds.map(sourceId => ({ sourceId, target: { collection: location, matterId: location === 'matter' ? matter?.id ?? null : null, matterTitle: location === 'matter' ? matter?.title ?? null : null } }));
    try { await request('/source-organization/apply', { sourceIds, expectedVersion: preview.expectedVersion, changes, confirmAccessChanges: true }); saved(); close(); }
    catch (error) { setError((error as Error).message); }
    finally { setBusy(false); }
  }
  return <Modal title={mode === 'manual' ? 'Organize selected files' : 'Review filing with Counsel'} onClose={close} busy={busy}>
    <div className="record-form import-organize-form">
      <p>{sourceIds.length} selected files, including selections on other pages. Originals, versions, citations and approvals stay unchanged.</p>
      <p className="fine-print">Linking a file to a matter makes it available to that matter’s chats. Library placement alone does not change chat access. It never adopts a practice standard.</p>
      {!preview && !error && <p role="status">Checking selected files…</p>}
      {preview && mode === 'manual' && <>
        <label>File these in<select aria-label="Selected files destination" disabled={busy} value={location} onChange={event => setLocation(event.target.value)}>
          <option value="">Choose a location…</option><option value="matter">An existing matter</option><option value="practice">Practice · your reusable material</option><option value="external">Sources · external references</option>
        </select></label>
        {location === 'matter' && <label>Matter<MatterPicker label="Matter for selected files" value={matter?.id ?? ''} matters={data.matters} disabled={busy}
          onChange={(_id, value) => setMatter(value ?? null)} /></label>}
        <details><summary>Review selected files</summary><ul>{preview.files.map(file => <li key={file.sourceId}>{file.title}</li>)}</ul></details>
      </>}
      {preview && mode === 'suggest' && !suggestions && <>
        <label>Anything Counsel should know? <span className="fine-print">Optional</span><textarea aria-label="Filing instructions" rows={3} maxLength={2000} value={instruction} disabled={busy} onChange={event => setInstruction(event.target.value)} /></label>
        <p className="fine-print">Generate suggestions sends only these files’ titles, first 3,000 text characters each, and matching matter names to {data.connection.label}{data.connection.config ? ` · ${data.connection.config.model}` : ''}. Other matter contents, chats and your profile are not sent. Review before saving.</p>
        {!data.connection.ready && <p>No AI connection is ready. Manual filing is available.</p>}
      </>}
      {suggestions && <>
        <p className="fine-print">Low-confidence suggestions start unchecked. Uncertain files stay in Needs organizing.</p>
        <div className="import-suggestions">{suggestions.suggestions.map(item => <section className="import-suggestion" key={item.sourceId}>
          <label className="import-suggestion-title"><input type="checkbox" checked={chosen.includes(item.sourceId)} disabled={busy || item.target.collection === 'unfiled'}
            onChange={event => setChosen(values => event.target.checked ? [...values, item.sourceId] : values.filter(id => id !== item.sourceId))} /><span>{item.title}</span></label>
          <p>Needs organizing → <strong>{item.target.collection === 'matter' ? `Matter: ${item.target.matterTitle}` : item.target.collection === 'practice' ? 'Practice' : item.target.collection === 'external' ? 'External references' : 'Keep unfiled'}</strong></p>
          <p>{item.reason}</p><p className="fine-print">Confidence: {item.confidence}{item.partial ? ' · Partial excerpt' : ''}</p>
          <details><summary>Supporting text</summary><blockquote>{item.evidenceQuote}</blockquote></details>
        </section>)}</div>
        <details className="fine-print"><summary>Matter names shared with Counsel</summary>{suggestions.sharedMatters.length
          ? <ul>{suggestions.sharedMatters.map(matter => <li key={matter.id}>{matter.title}</li>)}</ul> : <p>No matching candidates.</p>}</details>
      </>}
      {error && <ErrorNotice message={error} retry={busy ? undefined : () => setRetry(n => n + 1)} />}
      <div className="form-actions">{active.current ? <button className="button" onClick={stop}>Stop suggestions</button> : <button className="button" disabled={busy} onClick={close}>Cancel</button>}
        {mode === 'suggest' && !suggestions ? <button className="button button-primary" disabled={busy || !preview || !data.connection.ready || sourceIds.length > 20} onClick={suggest}>{busy ? 'Preparing suggestions…' : 'Generate suggestions'}</button>
          : <button className="button button-primary" disabled={busy || !preview || (suggestions ? !chosen.length : !location || (location === 'matter' && !matter))} onClick={save}>
            {busy ? 'Saving…' : `Organize ${suggestions ? chosen.length : sourceIds.length} ${(suggestions ? chosen.length : sourceIds.length) === 1 ? 'file' : 'files'}`}</button>}
      </div>
    </div>
  </Modal>;
}
