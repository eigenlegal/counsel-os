import { useEffect, useRef, useState } from 'react';
import { href, request, type Conversation } from './api';
import type { ConversationImpact } from '../../../src/workspace/conversation-lifecycle';
import { ErrorNotice, Modal } from './components';
import { Icon } from './icons';

type Action = 'rename' | 'archive' | 'trash' | 'restore';
export function ConversationActions({ conversation, running = false, onChanged }: {
  conversation: Conversation; running?: boolean; onChanged: () => void;
}): JSX.Element {
  const [open, setOpen] = useState(false);
  const [action, setAction] = useState<Action | null>(null);
  const [impact, setImpact] = useState<ConversationImpact | null>(null);
  const [title, setTitle] = useState(conversation.title);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const anchor = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const lifecycle = conversation.lifecycle ?? 'active';
  useEffect(() => {
    if (!open) return;
    const outside = (event: MouseEvent) => { if (!anchor.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setOpen(false); trigger.current?.focus(); } };
    document.addEventListener('mousedown', outside);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('mousedown', outside); document.removeEventListener('keydown', escape); };
  }, [open]);
  useEffect(() => {
    if (!action) return;
    const abort = new AbortController();
    setImpact(null); setError(''); setTitle(conversation.title);
    request<ConversationImpact>(`/conversations/${conversation.id}/impact`, undefined, abort.signal)
      .then(value => { if (!abort.signal.aborted) setImpact(value); })
      .catch(e => { if (!abort.signal.aborted) setError(e.message); });
    return () => abort.abort();
  }, [action, conversation.id]);
  const close = () => { setAction(null); requestAnimationFrame(() => trigger.current?.focus()); };
  async function apply() {
    if (!impact || !action || busy) return;
    setBusy(true); setError('');
    try {
      await request(`/conversations/${conversation.id}/manage`, {
        action, expectedVersion: impact.version, ...(action === 'rename' ? { title } : {}),
      });
      close(); onChanged();
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  const label = action === 'rename' ? 'Rename conversation' : action === 'archive' ? 'Archive conversation'
    : action === 'trash' ? 'Move conversation to Trash' : 'Restore conversation';
  return <div className="conversation-actions" ref={anchor}>
    <button ref={trigger} type="button" className="icon-button" aria-label={`Manage conversation: ${conversation.title}`}
      aria-expanded={open} disabled={running} title={running ? 'Stop the response or wait for it to finish' : 'Manage conversation'} onClick={() => setOpen(v => !v)}>
      <Icon name="more" size={19} />
    </button>
    {open && <div className="conversation-action-list" aria-label="Conversation actions">
      {(lifecycle === 'trashed' ? [['restore', 'Restore conversation']] : lifecycle === 'archived'
        ? [['rename', 'Rename'], ['restore', 'Move to active'], ['trash', 'Move to Trash']]
        : [['rename', 'Rename'], ['archive', 'Archive'], ['trash', 'Move to Trash']]).map(([value, text]) =>
        <button type="button" key={value} className={value === 'trash' ? 'destructive-text' : ''}
          onClick={() => { setOpen(false); setAction(value as Action); }}>{text}</button>)}
    </div>}
    {action && <Modal title={label} onClose={close} busy={busy}>
      <form className="record-form conversation-management" onSubmit={event => { event.preventDefault(); void apply(); }}>
        {action === 'rename' ? <label>Conversation title<input value={title} maxLength={300} required onChange={event => setTitle(event.target.value)} /></label>
          : <p className="conversation-management-title">{conversation.title}</p>}
        {action === 'archive' && <p>Keep this conversation in Archived, out of your active list. Its history remains searchable and available to Counsel within the permitted scope.</p>}
        {action === 'restore' && <p>Return this conversation to Active. Its history will be available for search and future chat context again.</p>}
        {action === 'trash' && <>
          <p>Its messages and unsaved answer copies will leave normal search and future AI retrieval. You can restore the conversation from Trash.</p>
          {impact && <section className="conversation-retained" aria-label="Items that will remain">
            <h3>{impact.retained.length ? 'These items will remain' : 'No separate saved items were found'}</h3>
            <ul>{impact.retained.map(item => <li key={`${item.kind}:${item.id}`}>
              <a href={href(item.kind === 'source' ? 'references' : item.kind === 'knowledge' ? 'knowledge' : item.kind === 'matter' ? 'matters' : 'work', { id: item.id })} onClick={close}>
                <Icon name={item.kind === 'source' ? 'reference' : item.kind === 'knowledge' ? 'knowledge' : item.kind === 'matter' ? 'matter' : 'work'} size={16} />
                <span>{item.title}<small>{item.kind === 'source' ? 'Attached document — workspace copy retained' : item.kind === 'knowledge' ? 'Practice material — including proposals' : item.kind === 'matter' ? 'Applied matter updates' : 'Saved output or decision'}</small></span>
              </a>
            </li>)}</ul>
          </section>}
          <p className="fine-print">This does not undo applied changes, remove excerpts already saved in other records, or erase backups. Responses already running may have received the earlier context. Trash is recoverable storage, not permanent erasure.</p>
        </>}
        {!impact && !error && <p role="status">Checking this conversation and its saved items…</p>}
        {impact?.running && <p role="alert">A response is running. Stop it or wait for it to finish, then reopen this action.</p>}
        {error && <ErrorNotice message={error} />}
        <div className="form-actions"><button type="button" className="button button-quiet" disabled={busy} onClick={close}>Cancel</button>
          <button type="submit" className={`button ${action === 'trash' ? 'button-danger' : 'button-primary'}`} disabled={busy || !impact || impact.running || (action === 'rename' && !title.trim())}>
            {busy ? 'Saving…' : action === 'rename' ? 'Save name' : action === 'trash' ? 'Move to Trash' : action === 'archive' ? 'Archive' : 'Restore to active'}
          </button></div>
      </form>
    </Modal>}
  </div>;
}
