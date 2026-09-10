import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { request, type Matter } from './api';
import type { MatterMatches, MatterOption } from '../../../src/workspace/matter-picker';
import { Modal, ErrorNotice, kindLabel } from './components';
import { Icon } from './icons';
import './matter-picker.css';

export interface MatterChoice { value: string; label: string; description?: string; }
/** Shared selection control. Opening/searching is read-only; only an explicit choice changes the field. */
export function MatterPicker({ value, onChange, matters, label = 'Matter', name, disabled = false,
  choices = [], compact = false }: {
  value: string; onChange: (value: string, matter?: Pick<Matter, 'id' | 'title'>) => void; matters: Pick<Matter, 'id' | 'title'>[];
  label?: string; name?: string; disabled?: boolean; choices?: MatterChoice[]; compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Pick<Matter, 'id' | 'title'> | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const known = matters.find(m => m.id === value);
  const special = choices.find(c => c.value === value);
  useEffect(() => {
    if (!value || known || special || selected?.id === value) return;
    const abort = new AbortController();
    request<Matter>(`/matters/${encodeURIComponent(value)}`, undefined, abort.signal)
      .then(matter => { if (!abort.signal.aborted) setSelected(matter); }).catch(() => {});
    return () => abort.abort();
  }, [value, known?.id, special?.value, selected?.id]);
  const title = special?.label ?? known?.title ?? (selected?.id === value ? selected.title : 'Choose a matter');
  const close = () => { setOpen(false); requestAnimationFrame(() => trigger.current?.focus()); };
  return <>
    {name && <input type="hidden" name={name} value={value} />}
    <button ref={trigger} type="button" className={`matter-picker-trigger ${compact ? 'compact' : ''}`}
      aria-label={label} aria-haspopup="dialog" aria-expanded={open} title={title} disabled={disabled}
      onClick={() => setOpen(true)}>
      <span>{title}</span><Icon name="chevron" size={12} />
    </button>
    {open && createPortal(<MatterPickerDialog value={value} label={label} choices={choices} close={close}
      choose={(choice, matter) => { if (disabled) return; if (matter) setSelected(matter); onChange(choice, matter); close(); }} />, document.body)}
  </>;
}

function MatterPickerDialog({ value, label, choices, close, choose }: {
  value: string; label: string; choices: MatterChoice[]; close: () => void;
  choose: (value: string, matter?: MatterOption) => void;
}) {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<MatterMatches | null>(null);
  const [loading, setLoading] = useState(true), [error, setError] = useState('');
  const [retry, setRetry] = useState(0), [active, setActive] = useState(0);
  const listId = useId(), hintId = useId();
  const list = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const abort = new AbortController();
    setLoading(true); setError(''); setResult(null); setActive(0);
    const timer = setTimeout(() => {
      request<MatterMatches>(`/matters/picker?q=${encodeURIComponent(query.trim())}`, undefined, abort.signal)
        .then(next => { if (!abort.signal.aborted) { setResult(next); setLoading(false); } })
        .catch(e => { if (!abort.signal.aborted) { setError(e.message); setLoading(false); } });
    }, query ? 120 : 0);
    return () => { clearTimeout(timer); abort.abort(); };
  }, [query, retry]);
  const specials = query.trim() ? [] : choices;
  const rows = [
    ...specials.map(choice => ({ ...choice, matter: undefined as MatterOption | undefined })),
    ...(result?.items ?? []).map(matter => ({ value: matter.id, label: matter.title, matter,
      description: [kindLabel(matter.kind), matter.status ? ({open: 'Open', 'on-hold': 'On hold', closed: 'Closed'}[matter.status]) : 'Status not set'].join(' · ') })),
  ];
  const focused = rows[active];
  useEffect(() => {
    list.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView?.({ block: 'nearest' });
  }, [active]);
  return <Modal title={label === 'Conversation context' ? 'Choose conversation context' : 'Choose a matter'} onClose={close}>
    <div className="matter-picker-body">
      <div className="matter-picker-search">
        <Icon name="search" size={19} />
        <input ref={search} role="combobox" aria-label="Search matters" placeholder="Search by name, client or keyword…"
          value={query} maxLength={250} autoComplete="off" aria-autocomplete="list" aria-expanded="true"
          aria-controls={listId} aria-describedby={hintId} aria-activedescendant={focused ? `${listId}-${active}` : undefined}
          onChange={event => { setQuery(event.target.value); setResult(null); setLoading(true); setActive(0); }}
          onKeyDown={event => {
            if (event.nativeEvent.isComposing) return;
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              event.preventDefault();
              setActive(index => Math.max(0, Math.min(rows.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1))));
            } else if (event.key === 'Enter') {
              event.preventDefault();
              if (focused) choose(focused.value, focused.matter);
            }
          }} />
        {query && <button type="button" className="icon-button" aria-label="Clear matter search"
          onClick={() => { setQuery(''); setResult(null); setLoading(true); setActive(0); search.current?.focus(); }}>
          <Icon name="close" size={16} />
        </button>}
      </div>
      <p className="matter-picker-help" id={hintId}>Search matter names. Arrow keys to move, Enter to choose, Esc to cancel.</p>
      {error && <ErrorNotice message={error} retry={() => setRetry(n => n + 1)} />}
      <div ref={list} id={listId} role="listbox" aria-label="Matter choices" aria-busy={loading} className="matter-picker-list">
        {rows.map((row, index) => <div key={row.value}>
          {(index === 0 || index === specials.length) && <div className="matter-picker-group" aria-hidden="true">
            {index < specials.length ? 'Context options' : query.trim() ? 'Matching matters' : 'Recent matters'}
          </div>}
          <div id={`${listId}-${index}`} role="option" aria-selected={value === row.value}
            aria-label={row.label} data-index={index} className={`matter-picker-option ${active === index ? 'active' : ''}`}
            onMouseDown={event => event.preventDefault()} onMouseMove={() => setActive(index)}
            onClick={() => choose(row.value, row.matter)}>
            <Icon name={row.matter ? 'matter' : row.value === 'new' || row.value === '__new' ? 'plus' : 'shield'} size={18} />
            <span><strong>{row.label}</strong>{row.description && <small>{row.description}</small>}</span>
            {value === row.value && <Icon name="check" size={16} />}
          </div>
        </div>)}
      </div>
      <div className="matter-picker-footer" role="status">
        {loading ? 'Finding matters…' : error ? 'Search is unavailable. Retry above.' : !result?.total
          ? query.trim() ? 'No matching matters. Try fewer words or part of the name.' : 'No matters yet. You can start a conversation without one.'
          : result.total > result.items.length ? `Showing ${result.items.length} of ${result.total} matters. Search to narrow the list.`
          : `${result.total} ${result.total === 1 ? 'matter' : 'matters'}${query.trim() ? ' found' : ' · most recently active first'}`}
      </div>
    </div>
  </Modal>;
}
