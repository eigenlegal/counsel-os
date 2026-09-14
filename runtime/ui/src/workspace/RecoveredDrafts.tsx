import { useEffect, useState } from 'react';
import { href, request } from './api';
import { ErrorNotice, fullDate } from './components';
import type { DraftSummary } from '../../../src/workspace/draft-types';

export function draftHref(key: string) {
  if (key === 'practice-document') return href('knowledge', { section: 'preferences', view: 'edit' });
  if (key === 'working-preferences') return href('knowledge', { section: 'preferences', view: 'documents' });
  const [, kind, matter, fresh] = key.split(':');
  return kind === 'new' ? href('home', { ...(matter ? {matter} : {}), ...(fresh ? {new: fresh} : {}) }) : href('home', {id: kind});
}
export function RecoveredDrafts() {
  const [drafts, setDrafts] = useState<DraftSummary[]>([]), [error, setError] = useState('');
  const [revision, setRevision] = useState(0), [busy, setBusy] = useState('');
  useEffect(() => {
    const abort = new AbortController();
    request<DraftSummary[]>('/drafts', undefined, abort.signal).then(value => { setDrafts(value); setError(''); })
      .catch(e => { if (!abort.signal.aborted) setError(e.message); });
    return () => abort.abort();
  }, [revision]);
  async function discard(draft: DraftSummary) {
    if (!window.confirm('Discard this unsent draft? Sent messages, documents and saved preferences are kept.')) return;
    setBusy(draft.key); setError('');
    try { await request('/drafts', { key: draft.key, expectedRevisionId: draft.revisionId, writeId: crypto.randomUUID(), value: null }); setRevision(v => v + 1); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(''); }
  }
  if (!drafts.length && !error) return null;
  return <section className="recovered-drafts" aria-label="Recovered drafts">
    <h2>Pick up a draft <span>{drafts.length}</span></h2>
    <p className="fine-print">Kept on this device, not sent to AI. Unapplied preference edits stay out of your working instructions.</p>
    {error && <ErrorNotice message={error} retry={() => setRevision(v => v + 1)} />}
    <ul>{drafts.map(draft => <li key={draft.key}><a href={draftHref(draft.key)}><strong>{draft.title}</strong><time>{fullDate(draft.updatedAt)}</time></a>
      <button type="button" className="text-button" disabled={!!busy} onClick={() => void discard(draft)} aria-label={`Discard draft: ${draft.title}`}>Discard</button></li>)}</ul>
  </section>;
}
