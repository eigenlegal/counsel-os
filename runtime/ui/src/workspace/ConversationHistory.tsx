import { useEffect, useState } from 'react';
import { href, request, type ConversationSummary, type Snapshot } from './api';
import { Empty, ErrorNotice, fullDate, PageHeader } from './components';
import { Icon } from './icons';
import { ConversationActions } from './ConversationActions';
import type { ConversationState } from '../../../src/workspace/conversation-lifecycle';
import { RecoveredDrafts } from './RecoveredDrafts';

export function ConversationHistory({ conversations, data, onChanged = () => {} }: { conversations: ConversationSummary[]; data: Snapshot; onChanged?: () => void }): JSX.Element {
  const [query, setQuery] = useState('');
  const [view, setView] = useState<ConversationState>(() => new URLSearchParams(location.hash.split('?')[1]).get('state') === 'trashed' ? 'trashed' : 'active');
  const [others, setOthers] = useState<ConversationSummary[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    setError('');
    if (view === 'active') { setLoading(false); return; }
    const abort = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    setOthers([]); setLoading(true);
    async function poll() {
      try {
        const result = await request<ConversationSummary[]>(`/conversations?state=${view}`, undefined, abort.signal);
        if (!abort.signal.aborted) { setOthers(result); setError(''); }
      } catch (e) { if (!abort.signal.aborted) setError((e as Error).message); }
      if (!abort.signal.aborted) { setLoading(false); timer = setTimeout(() => void poll(), 2000); }
    }
    void poll();
    return () => { abort.abort(); clearTimeout(timer); };
  }, [view, revision]);
  const items = view === 'active' ? conversations : others;
  const context = (chat: ConversationSummary) => chat.matterId
    ? data.matters.find(m => m.id === chat.matterId)?.title ?? 'Matter conversation'
    : chat.clientContext?.name ?? (chat.selectedMatters ? `${chat.selectedMatters.length} matters: ${chat.selectedMatters.map(m => m.title).join(', ')}`
      : chat.scope === 'workspace' ? 'Across the workspace' : 'This conversation');
  const visible = items.filter(chat => `${chat.title} ${context(chat)}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
  return <section className="conversation-history" aria-label="Conversation history">
    <PageHeader title="Chats" description="Pick up a conversation, or start something new. Your other chats can keep running."
      action={<a className="button button-primary" href={href('home', { new: crypto.randomUUID() })}><Icon name="plus" size={17} />New chat</a>} />
    <div className="conversation-history-toolbar">
      <div className="conversation-views" aria-label="Conversation views">{(['active', 'archived', 'trashed'] as const).map(state =>
        <button type="button" key={state} aria-pressed={view === state} onClick={() => setView(state)}>{state === 'active' ? 'Active' : state === 'archived' ? 'Archived' : 'Trash'}</button>)}</div>
      <label className="filter-input"><Icon name="search" size={17} /><input aria-label="Find a conversation" placeholder="Find by title or matter…" value={query} onChange={e => setQuery(e.target.value)} /></label>
    </div>
    {view === 'active' && (data.interfaceVersion ?? 0) >= 29 && <RecoveredDrafts />}
    {view !== 'active' && <p className="fine-print">{view === 'archived' ? 'Out of your active list, still available as historical context.' : 'Excluded from normal search and future AI retrieval. Restore a conversation to use it again. Permanent deletion is not available yet.'}</p>}
    {error && <ErrorNotice message={error} />}
    <div className="conversation-history-results">
      {loading ? <p role="status">Loading conversations…</p> : !visible.length ? <Empty title={query ? 'No matching conversations' : view === 'active' ? 'Your conversations will stay here' : view === 'archived' ? 'No archived conversations' : 'Trash is empty'} icon="chat">
        {query ? 'Try another title or matter name.' : 'Start a conversation to ask a question, work on a document, or shape a practice instruction.'}
      </Empty> : <ul className="conversation-history-list">{visible.map(chat => <li key={chat.id}>
        <a href={href('home', { id: chat.id })}><Icon name="chat" size={19} /><div><strong>{chat.title}</strong><span>{context(chat)}</span></div>
          <div className="conversation-history-meta"><span>{chat.running ? 'Responding…' : `${chat.turnCount} ${chat.turnCount === 1 ? 'message' : 'messages'}`}</span><time dateTime={chat.updatedAt}>{fullDate(chat.updatedAt)}</time></div>
        </a><ConversationActions conversation={chat} running={chat.running} onChanged={() => { setRevision(v => v + 1); onChanged(); }} />
      </li>)}</ul>}
    </div>
    {items.length === 200 && <p className="fine-print">Showing the 200 most recently updated conversations in this view. This filter searches their titles and matter names.</p>}
  </section>;
}
