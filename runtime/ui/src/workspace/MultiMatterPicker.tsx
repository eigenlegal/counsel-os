import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { request } from './api';
import type { MatterMatches } from '../../../src/workspace/matter-picker';
import { Modal, ErrorNotice } from './components';
import { Icon } from './icons';
import './matter-picker.css';

export type SelectedMatter = { id: string; title: string };

/** A local, cancellable selection. Search changes neither scope nor filing. */
export function MultiMatterPicker({ selected, close, choose }: {
  selected: SelectedMatter[]; close: () => void; choose: (matters: SelectedMatter[]) => void;
}) {
  const [selection, setSelection] = useState(selected);
  const [query, setQuery] = useState('');
  const [matches, setMatches] = useState<MatterMatches | null>(null);
  const [error, setError] = useState(''), [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setMatches(null); setError('');
    const timer = setTimeout(() => {
      request<MatterMatches>(`/matters/picker?q=${encodeURIComponent(query.trim())}`, undefined, controller.signal)
        .then(value => { if (!controller.signal.aborted) setMatches(value); })
        .catch(e => { if (!controller.signal.aborted) setError(e.message); });
    }, query ? 120 : 0);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, retry]);
  const toggle = (matter: SelectedMatter) => setSelection(current => current.some(m => m.id === matter.id)
    ? current.filter(m => m.id !== matter.id)
    : current.length < 100 ? [...current, matter] : current);
  return createPortal(<Modal title="Select matters" onClose={close}>
    <div className="multi-matter-picker">
      <p>Bring specific matters into this chat. No client is required. Other matters stay outside its context.</p>
      <div className="matter-picker-search">
        <Icon name="search" size={18} />
        <input aria-label="Search matters to include" placeholder="Search by name, client or keyword…"
          value={query} maxLength={250} onChange={e => setQuery(e.target.value)} />
      </div>
      <div className="multi-matter-selection-heading"><strong>{selection.length} selected</strong>
        {!!selection.length && <button type="button" className="text-button" onClick={() => setSelection([])}>Clear selection</button>}
      </div>
      {!!selection.length && <div className="multi-matter-selected" aria-label="Selected matters">
        {selection.map(matter => <button type="button" key={matter.id} onClick={() => toggle(matter)}
          aria-label={`Remove ${matter.title}`} title={matter.title}>
          <span>{matter.title}</span><Icon name="close" size={12} />
        </button>)}
      </div>}
      {error && <ErrorNotice message={error} retry={() => setRetry(n => n + 1)} />}
      <div className="multi-matter-results" aria-label="Matching matters" aria-busy={!matches && !error}>
        {matches?.items.map(matter => {
          const checked = selection.some(m => m.id === matter.id);
          return <label key={matter.id} className={checked ? 'selected' : ''}>
            <input type="checkbox" checked={checked} disabled={!checked && selection.length >= 100}
              onChange={() => toggle({id: matter.id, title: matter.title})} />
            <span>{matter.title}</span>
          </label>;
        })}
      </div>
      <p className="multi-matter-result-count" role="status">{selection.length >= 100 ? 'Up to 100 matters per chat. Remove one to select another.'
        : error ? 'Search is unavailable. Your selection is retained.' : !matches ? 'Finding matters…'
        : !matches.total ? 'No matching matters. Try another name or keyword.'
        : matches.total > matches.items.length ? `Showing ${matches.items.length} of ${matches.total} matters. Search to narrow the list.`
        : `${matches.total} matters${query.trim() ? ' found' : ' · most recently active first'}`}</p>
      <p className="fine-print">Your selection is fixed when the conversation starts. Combined answers stay in this chat; they are not filed into every selected matter.</p>
      <div className="multi-matter-actions">
        <button type="button" className="text-button" onClick={() => choose([])}>This conversation only</button>
        <button type="button" className="button" onClick={close}>Cancel</button>
        <button type="button" className="button button-primary" disabled={!selection.length} onClick={() => choose(selection)}>Use selected matters</button>
      </div>
    </div>
  </Modal>, document.body);
}
