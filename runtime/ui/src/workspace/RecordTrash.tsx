import { useEffect, useState } from 'react';
import type { ManagedRecord, RecordTrashPage } from '../../../src/workspace/record-lifecycle';
import { href, request } from './api';
import { Empty, ErrorNotice, PageHeader, fullDate } from './components';
import { Icon } from './icons';
import { RecordActions } from './RecordActions';

export function RecordTrash({ changed }: { changed: () => void }) {
  const [kind, setKind] = useState<ManagedRecord>('source');
  const [query, setQuery] = useState(''), [page, setPage] = useState(0), [retry, setRetry] = useState(0);
  const [value, setValue] = useState<RecordTrashPage | null>(null), [error, setError] = useState('');
  useEffect(() => {
    const abort = new AbortController(); setValue(null); setError('');
    const timer = setTimeout(() => request<RecordTrashPage>(`/trash?kind=${kind}&q=${encodeURIComponent(query)}&page=${page}`, undefined, abort.signal)
      .then(next => { if (!abort.signal.aborted) setValue(next); })
      .catch(e => { if (!abort.signal.aborted) setError(e.message); }), 120);
    return () => { abort.abort(); clearTimeout(timer); };
  }, [kind, query, page, retry]);
  useEffect(() => { const focus = () => setRetry(n => n + 1); window.addEventListener('focus', focus); return () => window.removeEventListener('focus', focus); }, []);
  return <section className="record-trash-page">
    <PageHeader title="Trash" description="Restore documents and saved outputs from anywhere in your workspace. Permanent deletion is not available yet." />
    <div className="collection-toolbar"><div className="conversation-views" aria-label="Trash views">
      <button aria-pressed={kind === 'source'} onClick={() => { setKind('source'); setPage(0); }}>Documents</button>
      <button aria-pressed={kind === 'work'} onClick={() => { setKind('work'); setPage(0); }}>Saved outputs</button>
    </div><label className="filter-input"><Icon name="search" size={16} /><input aria-label="Find in Trash" placeholder="Find in Trash…" value={query} onChange={e => { setQuery(e.target.value); setPage(0); }} /></label></div>
    <p className="fine-print">Conversations are managed separately in <a href={href('home', { view: 'history', state: 'trashed' })}>conversation Trash</a>.</p>
    {error ? <ErrorNotice message={error} retry={() => setRetry(n => n + 1)} /> : !value ? <p role="status">Loading Trash…</p> : !value.records.length ? <Empty title="Nothing here" icon="trash">{query ? 'Try another title.' : 'Items you move to Trash will appear here until you restore them.'}</Empty> : <ul className="record-trash-list">{value.records.map(item => <li key={item.id}>
      <a href={href(kind === 'source' ? 'references' : 'work', { id: item.id })}><Icon name={kind === 'source' ? 'reference' : 'work'} size={19} /><span><strong>{item.title}</strong><small>Moved to Trash {fullDate(item.changedAt)}</small></span></a>
      <RecordActions kind={kind} id={item.id} trashed changed={() => { setRetry(n => n + 1); changed(); }} />
    </li>)}</ul>}
    {value && (page > 0 || value.hasMore) && <div className="library-pagination"><button className="button" disabled={!page} onClick={() => setPage(n => n - 1)}>Previous</button><span>Page {page + 1}</span><button className="button" disabled={!value.hasMore} onClick={() => setPage(n => n + 1)}>Next</button></div>}
  </section>;
}
