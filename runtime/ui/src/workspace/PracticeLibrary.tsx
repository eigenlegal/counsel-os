import { useContext, useEffect, useState } from 'react';
import { href, request, type Snapshot, type Source } from './api';
import type { PracticeLibraryPage } from '../../../src/workspace/practice-library';
import { Badge, Empty, ErrorNotice, kindLabel, Modal, PageHeader } from './components';
import { Icon } from './icons';
import type { EditorState } from './Editor';
import { PracticePreferences } from './PracticePreferences';
import { ProfileSetupContext } from './Profile';
import { TemplateEditor, TemplateDetail } from './Templates';
import { readingParts } from './DocumentReader';
import { DocumentUpload } from './DocumentUpload';

const usage = { guidance: 'Standing guidance', baseline: 'Imported baseline · in use', 'starting-point': 'Starting document', reference: 'Reference material', inactive: 'Not in use', proposed: 'Proposed guidance' };
export function PracticeLibrary({ data, openEditor, changed }: { data: Snapshot; openEditor: (state: EditorState) => void; changed: () => void }) {
  const readParams = () => new URLSearchParams(location.hash.split('?')[1]);
  const [params, setParams] = useState(readParams), [query, setQuery] = useState(''), [status, setStatus] = useState('all'), [page, setPage] = useState(0);
  const [value, setValue] = useState<PracticeLibraryPage | null>(null), [error, setError] = useState(''), [retry, setRetry] = useState(0);
  const [addingTemplate, setAddingTemplate] = useState(false);
  const [addingFile, setAddingFile] = useState(false);
  const editProfile = useContext(ProfileSetupContext);
  const preferences = params.get('section') === 'preferences';
  // Old bookmarks land in the combined library; templates remain a filter, not another collection.
  const category = params.get('category') ?? (params.get('section') === 'templates' ? 'template' : 'all');
  const template = data.templates?.find(t => t.id === params.get('template'));
  useEffect(() => {
    const sync = () => { setParams(readParams()); setPage(0); };
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);
  useEffect(() => {
    if (preferences) return;
    const abort = new AbortController(); setError(''); setValue(null);
    const timer = setTimeout(() => {
      request<PracticeLibraryPage>(`/practice-library?q=${encodeURIComponent(query)}&category=${category}&status=${status}&page=${page}`, undefined, abort.signal)
        .then(v => { if (!abort.signal.aborted) setValue(v); }).catch(e => { if (!abort.signal.aborted) setError(e.message); });
    }, 150);
    return () => { abort.abort(); clearTimeout(timer); };
  }, [query, category, status, page, preferences, data, retry]);
  useEffect(() => {
    const refresh = () => setRetry(n => n + 1);
    window.addEventListener('focus', refresh); return () => window.removeEventListener('focus', refresh);
  }, []);
  const navigate = (values: Record<string, string>) => { location.hash = href('knowledge', values); };
  return <>
    <PageHeader title="Practice" description="Your instructions, positions, methods, and starting documents. Ask Counsel to use or update them in chat."
      action={!preferences && <div className="practice-add-actions"><button className="button" onClick={() => setAddingFile(true)}><Icon name="attach" size={16} />Add a file</button>
        <button className="button button-primary" onClick={() => category === 'template' ? setAddingTemplate(true) : openEditor({ kind: 'knowledge' })}><Icon name="plus" size={16} />{category === 'template' ? 'Add a template' : 'Add to practice'}</button></div>} />
    <div className="practice-sections" role="group" aria-label="Practice section">
      <button aria-pressed={!preferences} onClick={() => navigate({})}>Library</button>
      <button aria-pressed={preferences} onClick={() => navigate({ section: 'preferences' })}>{data.practiceDocument ? 'Your practice' : 'Profile & preferences'}</button>
    </div>
    {preferences ? <PracticePreferences data={data} changed={changed} editProfile={() => editProfile?.()} view={params.get('view')} /> : template ?
      <TemplateDetail item={template} data={data} changed={changed} /> : <section aria-label="Practice library">
      <div className="collection-toolbar practice-library-toolbar">
        <label className="filter-input"><Icon name="search" size={17} /><input aria-label="Search practice" placeholder="Find in your practice…" value={query} onChange={e => { setQuery(e.target.value); setPage(0); }} /></label>
        <div className="collection-toolbar-tools">
          <select className="collection-category" aria-label="Practice category" value={category} onChange={e => navigate({ category: e.target.value })}>
            <option value="all">All materials</option><option value="position">Positions</option><option value="method">Methods</option><option value="language">Reusable language</option><option value="pattern">Lessons &amp; patterns</option><option value="template">Templates</option><option value="material">Other materials</option>
          </select>
          <select className="collection-category" aria-label="Practice use" value={status} onChange={e => { setStatus(e.target.value); setPage(0); }}>
            <option value="all">Any status</option><option value="in-use">In use</option><option value="review">Needs review</option><option value="inactive">Not in use</option>
          </select>
        </div>
      </div>
      <p className="practice-library-note">Your imported standards remain your baseline. Proposed changes need your review; adding a file does not make it a standard.</p>
      {error ? <ErrorNotice message={error} retry={() => setRetry(n => n + 1)} /> : !value ? <p role="status">Loading practice…</p> : !value.records.length ?
        <Empty title="No practice materials here" action={<button className="button" onClick={() => { setQuery(''); setStatus('all'); setPage(0); navigate({}); }}>Clear filters</button>}>Add material or try a different search.</Empty> :
        <div className="resource-list">{value.records.map(item => <a className="resource-row" key={`${item.recordKind}:${item.id}`}
          href={item.recordKind === 'template' ? href('knowledge', { category: 'template', template: item.id }) : href(item.recordKind === 'knowledge' ? 'knowledge' : 'references', { id: item.id })}>
          <span className="resource-icon resource-icon-knowledge"><Icon name={item.recordKind === 'knowledge' ? 'knowledge' : 'reference'} size={22} /></span>
          <span className="resource-copy"><span className="resource-title"><strong>{item.title}</strong>{item.needsReview && <Badge tone="amber">Needs review</Badge>}</span>
            <p>{readingParts(item.preview).body.replace(/^#{1,6}\s+/gm, '').trim() || 'Open to view the original document.'}</p>
            <span className="resource-meta"><span>{item.category === 'material' ? 'Practice material' : kindLabel(item.category)}</span><span>{item.use === 'baseline' && item.category !== 'position'
              ? item.category === 'pattern' ? 'Historical context · not a standard' : item.category === 'language' ? 'Starting language · in use' : 'Working method · in use'
              : usage[item.use]}</span>
              {item.matterId && <span>{data.matters.find(m => m.id === item.matterId)?.title ?? 'Matter-specific'}</span>}
              {item.originalCount > 0 && item.recordKind === 'knowledge' && <span>Original retained</span>}</span>
          </span><Icon name="chevron" size={17} />
        </a>)}</div>}
      {value && <div className="library-pagination"><span>{value.total} {value.total === 1 ? 'item' : 'items'}</span>{(page > 0 || value.hasMore) && <>
        <button className="button" disabled={!page} onClick={() => setPage(n => n - 1)}>Previous</button><span>Page {page + 1}</span><button className="button" disabled={!value.hasMore} onClick={() => setPage(n => n + 1)}>Next</button></>}</div>}
    </section>}
    {addingTemplate && <TemplateEditor data={data} close={() => setAddingTemplate(false)} saved={() => { setAddingTemplate(false); changed(); setRetry(n => n + 1); }} />}
    {addingFile && <PracticeFileUpload close={() => setAddingFile(false)} changed={changed} saved={file => { setAddingFile(false); changed(); location.hash = href('references', { id: file.id }); }} />}
  </>;
}

function PracticeFileUpload({ close, changed, saved }: { close: () => void; changed: () => void; saved: (file: Source) => void }) {
  const [uploading, setUploading] = useState(false), [filing, setFiling] = useState(false), [file, setFile] = useState<Source | null>(null), [error, setError] = useState('');
  async function fileInPractice(source: Source) {
    setFile(source); setFiling(true); setError('');
    try {
      await request(`/sources/${source.id}/placement`, { collection: 'practice', expectedRevisionId: source.placement?.revisionId ?? null });
      saved(source);
    } catch (e) { setError((e as Error).message); changed(); }
    finally { setFiling(false); }
  }
  return <Modal title="Add a practice file" onClose={close} busy={uploading || filing}>
    <div className="record-form"><p>Keep a reusable document in Practice. Its original is retained; uploading does not make it a standing instruction or share it with every chat.</p>
      {!file && <DocumentUpload busyChanged={setUploading} imported={source => { void fileInPractice(source); }} />}
      {filing && <p role="status">Filing your document in Practice…</p>}
      {file && error && <><p>The upload is saved, but its library location could not be changed. You do not need to upload it again.</p><ErrorNotice message={error} />
        <a href={href('references', { id: file.id })} onClick={close}>Open the retained file</a><button className="button" onClick={() => { void fileInPractice(file); }}>Try filing again</button></>}
      <div className="form-actions"><button className="button button-quiet" disabled={uploading || filing} onClick={close}>Close</button></div>
    </div>
  </Modal>;
}
