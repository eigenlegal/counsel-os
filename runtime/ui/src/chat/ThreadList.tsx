import type { ThreadHeader } from '../api/types';

export interface ThreadListProps {
  threads: ThreadHeader[];
  selected: string | null;
  busy?: boolean;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
}

/** A thread's name in the list: its title, or enough of its id to tell two
 * untitled threads apart. */
function label(thread: ThreadHeader): string {
  return thread.title !== undefined && thread.title !== '' ? thread.title : `untitled ${thread.id.slice(0, 8)}`;
}

export function ThreadList({
  threads,
  selected,
  busy = false,
  onSelect,
  onCreate,
  onDelete,
}: ThreadListProps): JSX.Element {
  return (
    <nav className="thread-list" aria-label="Threads">
      <div className="thread-list-head">
        <h2>Threads</h2>
        <button type="button" onClick={onCreate} disabled={busy}>
          New
        </button>
      </div>
      {threads.length === 0 ? (
        <p className="muted">No threads yet.</p>
      ) : (
        <ul>
          {threads.map(thread => (
            <li key={thread.id} className={thread.id === selected ? 'selected' : undefined}>
              <button type="button" className="thread-open" onClick={() => onSelect(thread.id)}>
                <span className="thread-title">{label(thread)}</span>
                <span className="thread-date">{new Date(thread.updatedAt).toLocaleDateString()}</span>
              </button>
              <button
                type="button"
                className="thread-delete"
                aria-label={`Delete ${label(thread)}`}
                onClick={() => onDelete(thread.id)}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </nav>
  );
}
