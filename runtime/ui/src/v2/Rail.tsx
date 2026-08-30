import type { ThreadHeader } from '../api/types';

export interface RailProps {
  threads: ThreadHeader[];
  selected: string | null;
  /** True while the main pane holds a draft — a conversation with no thread
   * yet. The draft is a row so the reader can see where they are. */
  draft: boolean;
  busy?: boolean;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}

/**
 * The title the first send gave the thread, or `Untitled`.
 *
 * A thread made by v1 or by the CLI has no title, and the row already prints
 * a date on its second line — so falling back to a date said the same thing
 * twice and told the reader nothing about which thread this is. `Untitled`
 * at least reads as a missing name rather than as a name.
 */
export function railLabel(thread: ThreadHeader): string {
  const title = thread.title?.trim() ?? '';
  return title !== '' ? title : 'Untitled';
}

export function Rail({ threads, selected, draft, busy = false, onSelect, onNew, onDelete }: RailProps): JSX.Element {
  return (
    <nav className="v2-rail" aria-label="Threads">
      <div className="v2-rail-head">
        <h2>Threads</h2>
        <button type="button" onClick={onNew} disabled={busy || draft}>
          New
        </button>
      </div>
      <ul className="v2-rail-list">
        {draft ? (
          <li className="v2-draft" aria-current="true">
            <span className="v2-thread-title">New conversation</span>
          </li>
        ) : null}
        {threads.map(thread => (
          <li key={thread.id} className="v2-thread" aria-current={thread.id === selected && !draft ? 'true' : undefined}>
            <button type="button" className="v2-thread-open" onClick={() => onSelect(thread.id)}>
              <span className="v2-thread-title">{railLabel(thread)}</span>
              <span className="v2-thread-date">{new Date(thread.updatedAt).toLocaleDateString()}</span>
            </button>
            <button
              type="button"
              className="v2-thread-delete"
              aria-label={`Delete ${railLabel(thread)}`}
              onClick={() => onDelete(thread.id)}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
      {threads.length === 0 && !draft ? <p className="muted">No threads yet.</p> : null}
    </nav>
  );
}
