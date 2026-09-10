import { useEffect, useRef, useState } from 'react';
import type { NavigationChange, NavigationItem, NavigationSnapshot } from '../../../src/workspace/navigation';
import { href, request } from './api';
import { Icon } from './icons';

type Section = keyof NavigationSnapshot['collapsed'];
type Props = { page: string; id?: string; enabled: boolean; close: () => void };

/** Navigation is a user preference, never a change to a matter or its access scope. */
export function SidebarRecents({ page, id, enabled, close }: Props): JSX.Element | null {
  const [data, setData] = useState<NavigationSnapshot | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const active = useRef(false), generation = useRef(0), pending = useRef(0);
  const queue = useRef(Promise.resolve());
  const root = useRef<HTMLDivElement>(null), focusPin = useRef<string | null>(null);
  const change = (command: NavigationChange, quiet = false) => {
    pending.current++; generation.current++;
    if (!quiet) setBusy(true);
    queue.current = queue.current.then(async () => {
      try {
        const next = await request<NavigationSnapshot>('/navigation', command);
        if (active.current) { setData(next); setError(''); }
      } catch (e) {
        focusPin.current = null;
        if (active.current && !quiet) setError((e as Error).message);
      } finally {
        pending.current--;
        if (active.current && !pending.current) setBusy(false);
      }
    });
  };
  useEffect(() => {
    if (!enabled) return;
    active.current = true;
    const abort = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      const revision = generation.current;
      try {
        const next = await request<NavigationSnapshot>('/navigation', undefined, abort.signal);
        if (!abort.signal.aborted && !pending.current && revision === generation.current) setData(next);
      } catch { /* Retain navigation during a temporary outage; main surface reports connectivity. */ }
      if (!abort.signal.aborted) timer = setTimeout(poll, 3000);
    };
    void poll();
    return () => { active.current = false; abort.abort(); clearTimeout(timer); };
  }, [enabled]);
  useEffect(() => {
    if (enabled && id && (page === 'home' || page === 'matters'))
      change({ action: 'visit', kind: page === 'home' ? 'conversation' : 'matter', id }, true);
  }, [enabled, page, id]);
  useEffect(() => {
    if (!focusPin.current || busy) return;
    const button = root.current?.querySelector<HTMLButtonElement>(`[data-pin-key="${focusPin.current}"]`)
      ?? root.current?.querySelector<HTMLButtonElement>('[aria-controls="sidebar-pinned"]');
    button?.focus(); focusPin.current = null;
  }, [data, busy]);
  if (!enabled || !data) return null;
  return <div className="sidebar-recents" ref={root}>
    {error && <p className="sidebar-navigation-error" role="alert">{error}</p>}
    {([
      ['pinned', 'Pinned', data.pinned], ['chats', 'Recent chats', data.recentChats], ['matters', 'Recent matters', data.recentMatters],
    ] as [Section, string, NavigationItem[]][]).map(([section, label, items]) => {
      if (section === 'pinned' && !items.length) return null;
      return <section key={section} aria-label={label}>
        <h2><button type="button" className="sidebar-section-toggle" aria-expanded={!data.collapsed[section]}
          aria-controls={`sidebar-${section}`} disabled={busy}
          onClick={() => change({ action: 'collapse', section, collapsed: !data.collapsed[section] })}>
          <span>{label}</span><Icon name="chevron" size={12} />
        </button></h2>
        {!data.collapsed[section] && <div id={`sidebar-${section}`}>
          {items.map(item => {
            const selected = item.id === id && page === (item.kind === 'matter' ? 'matters' : 'home');
            const pinLabel = `${section === 'pinned' ? 'Unpin' : 'Pin'} ${item.title}`;
            return <div key={`${item.kind}:${item.id}`} className={`sidebar-recent-row ${selected ? 'selected' : ''}`}>
              <a href={href(item.kind === 'matter' ? 'matters' : 'home', { id: item.id })} onClick={close}
                aria-current={selected ? 'page' : undefined} title={item.title}>
                <Icon name={item.kind === 'matter' ? 'matter' : 'chat'} size={14} />
                <span><span className="sidebar-record-title">{item.title}</span>
                  {item.running ? <small>Working…</small> : item.lastStatus && item.lastStatus !== 'complete' ? <small>Incomplete response</small> : null}
                </span>
              </a>
              <button type="button" className="sidebar-pin" aria-label={pinLabel} title={pinLabel} disabled={busy}
                data-pin-key={`${item.kind}:${item.id}`} aria-pressed={section === 'pinned'} onClick={() => {
                  focusPin.current = `${item.kind}:${item.id}`;
                  change({ action: 'pin', kind: item.kind, id: item.id, pinned: section !== 'pinned' });
                }}>
                <Icon name="pin" size={14} />
              </button>
            </div>;
          })}
          {!items.length && <p className="sidebar-empty">{section === 'chats' ? 'Your chats will appear here.' : 'Matters you open or work in appear here.'}</p>}
        </div>}
      </section>;
    })}
  </div>;
}
