import { readRouting, setRouting } from '../../api/client';
import type { RoutingView } from '../../api/types';
import { RoutingLine } from './RoutingLine';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, fetchJson, streamEvals } from '../../api/client';
import { EVAL_SET_KINDS, type EvalEstimate, type EvalSetKind, type Scoreboard, type ScoreboardRow, type ScoreboardTask } from '../../api/types';

export interface ModelsGroupProps {
  /** The providers the runtime can call, in registry order — the columns. */
  providerIds: string[];
}

/** "3d ago" / "today", the way the ledger says it. */
export function staleness(days: number): string {
  return days === 0 ? 'today' : `${days}d ago`;
}

/** The one-line confirmation before a run: what, how many, roughly what it costs. */
/**
 * How many of the task's fixtures this row actually scored. A fixture can
 * leave a result behind after its own `task` changed (or after it was
 * retired), which left the row reading `1/0` — a fraction a lawyer cannot
 * make sense of. When the denominator cannot hold the numerator, the count
 * stands on its own.
 */
export function scoredLabel(scored: number, fixtures: number): string {
  return fixtures >= scored && fixtures > 0 ? `${scored}/${fixtures}` : `${scored} scored`;
}

/** Money to the cent. A run cheaper than a cent says so rather than `$0.00`. */
export function runCost(usd: number): string {
  return usd < 0.005 ? '<$0.01/run' : `$${usd.toFixed(2)}/run`;
}

export function confirmLine(providerId: string, task: string, estimate: EvalEstimate): string {
  const fixtures = `${estimate.count} fixture${estimate.count === 1 ? '' : 's'}`;
  const cost = estimate.estimateUsd === null ? 'cost unknown' : `about $${estimate.estimateUsd.toFixed(2)}`;
  return `Score ${providerId} on ${task} · ${fixtures} · ${cost}`;
}

function hasRows(board: Scoreboard): boolean {
  return board.tasks.some(t => EVAL_SET_KINDS.some(k => t.sets[k].rows.length > 0));
}

/** The set the tabs open on: the first with a score, else the shipped suite. */
function firstSetWithRows(board: Scoreboard): EvalSetKind {
  for (const k of ['practice', 'shipped', 'benchmark'] as const) if (board.tasks.some(t => t.sets[k].rows.length > 0)) return k;
  return 'shipped';
}

interface Pending {
  task: string;
  providerId: string;
  estimate: EvalEstimate | null;
  error: string | null;
}

interface Running {
  task: string;
  providerId: string;
  /** "3 of 8 · law-beats-practice" once the first fixture starts. */
  line: string;
}

/**
 * Settings › Models (routing-and-evals spec §10): the scoreboard as a
 * task × provider ledger — set-text scores, hairlines, the three fixture
 * sets as small-caps tabs and never averaged together. Each cell is a quiet
 * "score" link that asks once (count and cost) and then runs in place, the
 * progress on the same line. No pills, no bars, no modal.
 */
export function ModelsGroup({ providerIds }: ModelsGroupProps): JSX.Element {
  const [board, setBoard] = useState<Scoreboard | null>(null);
  const [set, setSet] = useState<EvalSetKind | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [running, setRunning] = useState<Running | null>(null);
  // How each task is routed, and who that picks — read beside the scores and
  // re-read after a change so the pick shown is the pick a step would get.
  const [routing, setRoutingView] = useState<RoutingView | null>(null);
  const [routingBusy, setRoutingBusy] = useState(false);
  const [outcome, setOutcome] = useState<{ task: string; providerId: string; line: string } | null>(null);
  const abort = useRef<AbortController | null>(null);

  const load = async (): Promise<void> => {
    try {
      const next = await fetchJson<Scoreboard>('/evals/scoreboard');
      setBoard(next);
      setSet(current => current ?? firstSetWithRows(next));
      setError(null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return;
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const loadRouting = useCallback(async (): Promise<void> => {
    try {
      setRoutingView(await readRouting());
    } catch (err) {
      // The ledger still reads without it; an older runtime has no /routing.
      if (!(err instanceof ApiError && err.status === 401)) setRoutingView(null);
    }
  }, []);

  const changeRouting = async (task: string, change: { minScore?: number; prefer?: string; pinned?: string | null }): Promise<void> => {
    setRoutingBusy(true);
    try {
      setRoutingView(await setRouting({ task, ...change }));
    } catch (err) {
      if (!(err instanceof ApiError && err.status === 401)) setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRoutingBusy(false);
    }
  };

  useEffect(() => {
    void load();
      void loadRouting();
    void loadRouting();
    return () => abort.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ask = async (task: string, providerId: string): Promise<void> => {
    setOutcome(null);
    setPending({ task, providerId, estimate: null, error: null });
    try {
      const estimate = await fetchJson<EvalEstimate>(`/evals/estimate?task=${encodeURIComponent(task)}&providerId=${encodeURIComponent(providerId)}`);
      setPending(p => (p === null || p.task !== task || p.providerId !== providerId ? p : { ...p, estimate }));
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return;
      setPending(p => (p === null ? p : { ...p, error: err instanceof Error ? err.message : String(err) }));
    }
  };

  const run = async (task: string, providerId: string): Promise<void> => {
    setPending(null);
    setRunning({ task, providerId, line: 'starting…' });
    const controller = new AbortController();
    abort.current = controller;
    let failure: string | null = null;
    try {
      await streamEvals(
        { task, providerId, save: true, confirm: true },
        ev => {
          if (ev.event === 'progress') setRunning({ task, providerId, line: `${ev.data.index + 1} of ${ev.data.total} · ${ev.data.fixtureId}` });
          else if (ev.event === 'error') failure = ev.data.message;
        },
        controller.signal,
      );
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return;
      failure = err instanceof ApiError && err.body !== null && typeof err.body === 'object' && (err.body as { error?: string }).error === 'eval-busy' ? 'another run is in progress' : err instanceof Error ? err.message : String(err);
    } finally {
      abort.current = null;
      setRunning(null);
    }
    if (failure !== null) setOutcome({ task, providerId, line: `failed · ${failure}` });
    await load();
    // A saved run moves the scoreboard, and the pick can move with it.
    await loadRouting();
  };

  if (error !== null) {
    return (
      <p className="v2-notice v2-notice-error" role="alert">
        {error}
      </p>
    );
  }
  if (board === null || set === null) return <p className="muted">Loading…</p>;

  const columns = [...providerIds];
  for (const t of board.tasks) for (const k of EVAL_SET_KINDS) for (const r of t.sets[k].rows) if (!columns.includes(r.providerId)) columns.push(r.providerId);
  const tasks = board.tasks;

  const cell = (t: ScoreboardTask, providerId: string): JSX.Element => {
    const rows = t.sets[set].rows.filter(r => r.providerId === providerId);
    const fixtures = t.sets[set].fixtures;
    const isPending = pending !== null && pending.task === t.task && pending.providerId === providerId;
    const isRunning = running !== null && running.task === t.task && running.providerId === providerId;
    const busy = running !== null;
    const scoreLink = (label: string): JSX.Element => (
      <button type="button" className="v2-link v2-models-act" disabled={busy || isPending || fixtures === 0} onClick={() => void ask(t.task, providerId)}>
        {label}
      </button>
    );
    return (
      <td key={providerId} className="v2-models-cell">
        {rows.map((r: ScoreboardRow) => (
          <div key={r.modelVersion} className="v2-models-row">
            <span className={`v2-models-score${r.score === null ? ' v2-models-failed' : ''}`}>{r.score === null ? 'failed' : r.score.toFixed(2)}</span>
            {rows.length > 1 || r.modelVersion !== providerId.slice(providerId.indexOf('/') + 1) ? <span className="v2-models-version">{r.modelVersion}</span> : null}
            <span className="v2-models-facts">
              {scoredLabel(r.scored, fixtures)} · {staleness(r.staleDays)}
              {r.medianMs === null ? '' : ` · ${(r.medianMs / 1000).toFixed(1)}s`}
              {r.meanCostUsd === null ? '' : ` · ${runCost(r.meanCostUsd)}`}
            </span>
            {r.failed.length === 0 ? null : (
              <span className="v2-models-reason">
                {r.score === null ? '' : `${r.failed.length} failed · `}
                {r.failed[0]!.reason}
              </span>
            )}
          </div>
        ))}
        {isRunning ? (
          <span className="v2-models-progress" role="status">
            scoring {running.line}
          </span>
        ) : isPending ? (
          <span className="v2-models-confirm" role="alertdialog" aria-label={`Score ${providerId} on ${t.task}`}>
            {pending.error !== null ? (
              <>failed · {pending.error} </>
            ) : pending.estimate === null ? (
              <>Score {providerId} on {t.task} · … </>
            ) : (
              <>{confirmLine(providerId, t.task, pending.estimate)} </>
            )}
            {pending.estimate === null || pending.estimate.count === 0 ? null : (
              <button type="button" className="v2-link v2-models-act" onClick={() => void run(t.task, providerId)}>
                run
              </button>
            )}
            <button type="button" className="v2-link v2-models-act" onClick={() => setPending(null)}>
              cancel
            </button>
          </span>
        ) : (
          <span className="v2-models-acts">
            {outcome !== null && outcome.task === t.task && outcome.providerId === providerId ? <span className="v2-models-reason">{outcome.line} </span> : null}
            {rows.length === 0 ? scoreLink(fixtures === 0 ? 'no fixtures' : 'score') : scoreLink(rows.some(r => r.failed.length > 0) ? 'retry' : 'again')}
          </span>
        )}
      </td>
    );
  };

  return (
    <div className="v2-models">
      <div className="v2-models-tabs" role="tablist" aria-label="Fixture set">
        {EVAL_SET_KINDS.map((k, i) => (
          <span key={k}>
            {i === 0 ? null : <span className="v2-models-dot"> · </span>}
            <button type="button" role="tab" className="runin v2-models-tab" aria-selected={k === set} onClick={() => setSet(k)}>
              {k}
            </button>
          </span>
        ))}
      </div>
      {hasRows(board) ? null : <p className="muted v2-models-empty">Nothing scored yet. Score a provider on a task to fill this in.</p>}
      {tasks.length === 0 || columns.length === 0 ? null : (
        <div className="v2-models-scroll">
          <table className="v2-models-table" aria-label={`${set} scores`}>
            <thead>
              <tr>
                <th scope="col" className="runin">
                  task
                </th>
                {columns.map(id => (
                  <th key={id} scope="col" className="v2-models-provider">
                    {id}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tasks.map(t => (
                <tr key={t.task}>
                  <th scope="row" className="v2-models-task">
                    <span className="v2-models-taskname">
                      {t.task}
                      <span className="v2-models-count">{t.sets[set].fixtures} fixture{t.sets[set].fixtures === 1 ? '' : 's'}</span>
                    </span>
                    {routing === null ? null : (
                      <RoutingLine
                        task={t.task}
                        routing={routing.tasks[t.task]}
                        defaults={routing.defaults}
                        busy={routingBusy}
                        onChange={change => void changeRouting(t.task, change)}
                      />
                    )}
                  </th>
                  {columns.map(id => cell(t, id))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
