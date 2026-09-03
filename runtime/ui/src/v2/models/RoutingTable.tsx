/**
 * How every kind of work is routed — all of it, not just the parts that
 * happen to have a score.
 *
 * `GET /routing` answers for the tasks that carry a policy or a score, so a
 * practice that has scored nothing sees one row and cannot set a route for
 * the other ten kinds of work it does. The taxonomy is eleven tasks; this
 * shows eleven, each with the bar it has to clear, what breaks a tie, any
 * pin, and who that picks today. A task nobody has touched says so rather
 * than being absent.
 */
import { useCallback, useEffect, useState } from 'react';
import { ApiError, fetchJson } from '../../api/client';
import type { RoutingTask, RoutingView } from '../../api/types';
import { TASK_IDS } from '../../tasks';
import { RoutingLine } from './RoutingLine';

export interface RoutingTableProps {
  /** What answers when a task has no rule of its own. Without it the table
   * said "nothing scored yet" on every untouched row, which reads as "this
   * work does not route" — it does: it goes to the default. */
  fallback: string | null;
}

export function RoutingTable({ fallback }: RoutingTableProps): JSX.Element {
  const [view, setView] = useState<RoutingView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  /** Keyed by task: a change that failed says so on its own row. */
  const [failed, setFailed] = useState<Record<string, string>>({});

  const load = useCallback((): void => {
    void (async () => {
      try {
        setView(await fetchJson<RoutingView>('/routing'));
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) return;
        setError(err instanceof Error ? err.message : String(err));
      }
    })();
  }, []);
  useEffect(load, [load]);

  const change = async (task: string, patch: { minScore?: number; prefer?: string; pinned?: string | null }): Promise<void> => {
    setBusy(true);
    setFailed(prev => ({ ...prev, [task]: '' }));
    try {
      setView(await fetchJson<RoutingView>('/routing', { method: 'PUT', body: JSON.stringify({ task, ...patch }) }));
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return;
      setFailed(prev => ({ ...prev, [task]: err instanceof Error ? err.message : String(err) }));
    } finally {
      setBusy(false);
    }
  };

  if (error !== null) {
    return (
      <p className="v2-notice v2-notice-error" role="alert">
        {error}
      </p>
    );
  }
  if (view === null) return <p className="muted">Loading…</p>;

  // The taxonomy first, in its own order, then anything the file names that
  // the taxonomy does not — a practice may route a task we have not heard of.
  const extra = Object.keys(view.tasks).filter(t => !TASK_IDS.includes(t));
  return (
    <table className="v2-routing-table">
      <thead>
        <tr>
          <th scope="col">task</th>
          <th scope="col">how it routes</th>
          <th scope="col">picks today</th>
        </tr>
      </thead>
      <tbody>
        {[...TASK_IDS, ...extra].map(task => {
          const routing: RoutingTask | undefined = view.tasks[task];
          return (
            <tr key={task} className={routing === undefined ? 'v2-routing-untouched' : undefined}>
              <th scope="row">{task}</th>
              <td>
                <RoutingLine
                  task={task}
                  routing={routing}
                  defaults={view.defaults}
                  busy={busy}
                  {...(failed[task] === undefined || failed[task] === '' ? {} : { error: failed[task] })}
                  onChange={patch => void change(task, patch)}
                />
              </td>
              <td className="v2-routing-picks">
                {routing?.picked?.providerId ?? (
                  <>
                    {fallback ?? <span className="muted">no model loaded</span>}
                    {fallback === null ? null : <span className="v2-routing-why"> the default</span>}
                  </>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
