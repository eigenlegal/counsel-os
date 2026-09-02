/**
 * The routing ledger: what actually ran, and what it got.
 *
 * The scoreboard above says how models do on fixtures; the line under each
 * task says how that task is meant to route. Neither answers the question
 * you ask after a morning's work — what happened — and that is the only way
 * to find out whether the rule and the practice agree.
 *
 * One row per run, newest first, in the same set text as the rest of the
 * record: when, the conversation, the task, the model, why it got there,
 * what it cost, and your mark if you left one.
 */
import { useCallback, useEffect, useState } from 'react';
import { ApiError, readRoutingLedger } from '../../api/client';
import type { LedgerRun } from '../../api/types';

const SHOW = 20;

/** "just now" · "14:05" today · "Sep 1" before that. */
export function whenOf(at: string, now = new Date()): string {
  const t = new Date(at);
  if (Number.isNaN(t.getTime())) return '';
  const mins = (now.getTime() - t.getTime()) / 60_000;
  if (mins < 2) return 'just now';
  if (t.toDateString() === now.toDateString()) return t.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  return t.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** `1.2s` · `18s` · `2m 04s`. A run is measured in seconds, not in ms. */
export function tookOf(ms: number | undefined): string {
  if (ms === undefined) return '';
  if (ms < 10_000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  return `${Math.floor(ms / 60_000)}m ${String(Math.round((ms % 60_000) / 1000)).padStart(2, '0')}s`;
}

export function costOf(usd: number | undefined): string {
  if (usd === undefined) return '';
  return usd < 0.005 ? '<$0.01' : `$${usd.toFixed(2)}`;
}

/** The reason, in the words the record kept — or the honest blank. */
export function whyOf(run: LedgerRun): string {
  const reason = run.routeReason?.text ?? '';
  // The policy is worth saying even when the reason already implies it, but
  // never twice.
  if (run.policy === 'stays-local' && !reason.includes('this machine')) {
    return reason === '' ? 'stays on this machine' : `${reason} · stays on this machine`;
  }
  return reason;
}

export function RoutingLedger(): JSX.Element {
  const [runs, setRuns] = useState<LedgerRun[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [all, setAll] = useState(false);

  const load = useCallback(async (): Promise<void> => {
    try {
      setRuns(await readRoutingLedger(100));
      setError(null);
    } catch (err) {
      // An older runtime has no ledger; the group above still reads.
      if (!(err instanceof ApiError && err.status === 401)) setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (error !== null) {
    return (
      <p className="v2-ledger-quiet" role="alert">
        The ledger could not be read: {error}
      </p>
    );
  }
  if (runs === null) return <p className="v2-ledger-quiet">Reading the record…</p>;
  if (runs.length === 0) return <p className="v2-ledger-quiet">Nothing has run yet. Ask counsel something and it will show here.</p>;

  const shown = all ? runs : runs.slice(0, SHOW);
  return (
    <>
      {/* Six columns in a pane that is not always wide: the table scrolls
          inside its own box rather than the page scrolling sideways. */}
      <div className="v2-models-scroll">
        <table className="v2-ledger" aria-label="What ran">
          <thead>
            <tr>
              <th scope="col">when</th>
              <th scope="col">task</th>
              <th scope="col">model</th>
              <th scope="col">why</th>
              <th scope="col">took</th>
              <th scope="col">mark</th>
            </tr>
          </thead>
          <tbody>
            {shown.map(run => (
              <tr key={run.runId} className={run.status === 'done' ? undefined : 'v2-ledger-unfinished'}>
                <td className="v2-ledger-when" title={run.at}>
                  {whenOf(run.at)}
                </td>
                <td>
                  {run.task ?? 'chat'}
                  {run.thread === '' ? null : <span className="v2-ledger-thread"> · {run.thread}</span>}
                </td>
                <td>{run.provider === '' ? '—' : run.provider}</td>
                <td className="v2-ledger-why">{whyOf(run)}</td>
                <td className="v2-ledger-num">
                  {tookOf(run.durationMs)}
                  {run.costUsd === undefined ? null : ` · ${costOf(run.costUsd)}`}
                </td>
                <td>{run.status === 'done' ? (run.mark ?? '') : run.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {runs.length > SHOW && !all ? (
        <p className="v2-ledger-quiet">
          <button type="button" className="v2-link" onClick={() => setAll(true)}>
            {runs.length - SHOW} more
          </button>
        </p>
      ) : null}
    </>
  );
}
