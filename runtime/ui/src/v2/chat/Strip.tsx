import { useState } from 'react';
import { ApiError, correctTask, markTurn } from '../../api/client';
import type { RunMark, RunRecord, RunStatus, TaskSource } from '../../api/types';
import { sourceWord } from '../../tasks';
import { TaskPicker } from './TaskPicker';
import type { AssistantTurn } from '../../chat/turns';
import { Chevron } from '../icons';
import { stateOf } from '../verbs';
import { readPathsOf } from './cite';
import { Steps } from './Steps';
import { FixturePanel } from './FixturePanel';

export interface StripProps {
  turn: AssistantTurn;
  /** The run record once `GET /runs?thread=` has it. */
  run?: RunRecord;
  /** Milliseconds per tool id (from the record, or measured live). */
  ms: Record<string, number>;
  /** The thread the run belongs to — the marks and the task picker need it.
   * `null` (or absent) hides both: nothing to post against. */
  threadId?: string | null;
  onOpenFile?: (path: string) => void;
}

export interface Pill {
  kind: RunStatus;
  label: string;
  /** Hover text, for a label that needs one. */
  title?: string;
}

/** Where the status the runtime records is not the word to show a reader. */
const PILL_LABEL: Partial<Record<RunStatus, string>> = {
  timeout: 'timed out',
  // On disk the run is `abandoned`, which reads as "nobody wanted it". What
  // happened is that the page went away mid-step — the runtime may well have
  // finished the answer, and a reload can show it.
  abandoned: 'disconnected',
};

const PILL_TITLE: Partial<Record<RunStatus, string>> = {
  abandoned: 'the page disconnected mid-step; the answer may still have completed',
};

/** The status pill: the record when there is one, else the turn's own state. */
export function pillFor(turn: AssistantTurn, run?: RunRecord): Pill {
  const kind: RunStatus = run?.status ?? (turn.status === 'error' ? 'error' : turn.status === 'done' ? 'done' : 'running');
  const label = PILL_LABEL[kind] ?? kind;
  const title = PILL_TITLE[kind];
  return title === undefined ? { kind, label } : { kind, label, title };
}

export function formatMs(ms: number): string {
  return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`;
}

/**
 * A UUID, cut to the seven characters a person can compare at a glance —
 * the same length git shows. The full value stays in the `title`, so it is
 * one hover (and one copy) away for anyone matching it against a log.
 */
export function shortId(id: string): string {
  return id.length <= 7 ? id : id.slice(0, 7);
}

/** Sub-cent runs are the common case; two decimals would read as free. */
export function formatCost(usd: number): string {
  return usd === 0 ? '$0' : usd < 0.01 ? `$${usd.toFixed(4)}` : `$${usd.toFixed(2)}`;
}

/** `3 sources · 1 proposal pending · 1 document produced` — the collapsed
 * line's middle (spec §3.3). Empty when there is nothing to count. */
export function stripLine(turn: AssistantTurn): string {
  const sources = readPathsOf(turn.tools).length;
  const pending = turn.proposals.filter(p => p.status === 'pending').length;
  const parts: string[] = [];
  if (sources > 0) parts.push(`${sources} source${sources === 1 ? '' : 's'}`);
  if (pending > 0) parts.push(`${pending} proposal${pending === 1 ? '' : 's'} pending`);
  const produced = turn.artifacts.length;
  if (produced > 0) parts.push(`${produced} document${produced === 1 ? '' : 's'} produced`);
  return parts.join(' · ');
}

/**
 * A finished turn's work, folded into ONE HAIRLINE LINE (spec §3.3):
 * `DONE · 3 sources · 1 proposal pending · details`. Not a box and not a
 * ledger — the model, the duration and the tokens moved INTO the record, so
 * the collapsed line says only what a reader glancing past it needs.
 * Open, it is the full record — the steps with show/hide, primitives read,
 * proposals, usage and cost, the run id.
 */
export function Strip({ turn, run, ms, threadId = null, onOpenFile }: StripProps): JSX.Element {
  const pill = pillFor(turn, run);
  // The lawyer's word on the answer and on the task (routing-and-evals spec
  // §3, §7): the record on disk seeds both; a click posts and the page keeps
  // the answer without a reload.
  const [mark, setMark] = useState<RunMark | undefined>(run?.mark);
  const [task, setTask] = useState<{ task: string; source: TaskSource | undefined } | undefined>(run?.task === undefined ? undefined : { task: run.task, source: run.taskSource });
  const [busy, setBusy] = useState(false);
  const [postFailed, setPostFailed] = useState<string | null>(null);
  // The review screen behind "make this a fixture" opens under the strip,
  // never over the answer it was made from.
  const [fixturing, setFixturing] = useState(false);
  const [synced, setSynced] = useState(run);
  if (run !== synced) {
    setSynced(run);
    setMark(run?.mark);
    setTask(run?.task === undefined ? undefined : { task: run.task, source: run.taskSource });
  }
  const canAct = run !== undefined && threadId !== null && run.status === 'done';
  const post = async (work: () => Promise<void>): Promise<void> => {
    setBusy(true);
    setPostFailed(null);
    try {
      await work();
    } catch (err) {
      if (!(err instanceof ApiError && err.status === 401)) setPostFailed(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };
  const doMark = (value: RunMark['mark']): void => {
    if (run === undefined || threadId === null) return;
    void post(async () => setMark(await markTurn(threadId, run.runId, value)));
  };
  const doTask = (value: string): void => {
    if (run === undefined || threadId === null) return;
    void post(async () => {
      const next = await correctTask(threadId, run.runId, value);
      setTask({ task: next.task, source: next.taskSource });
    });
  };
  const provider = run?.provider !== undefined && run.provider !== '' ? run.provider : (turn.provider ?? '');
  // `stripLine` counts sources and pending proposals, so a failed call is
  // invisible in it. Carried alongside rather than folded in: the count is
  // the collapsed strip's only hint that something inside it went wrong.
  const failed = turn.tools.filter(tool => stateOf(tool) === 'error').length;
  // Counted apart from the failures: a tool that answered "nothing" did not
  // fail, and saying it did would send the reader looking for a broken tool
  // instead of an empty vault.
  const empty = turn.tools.filter(tool => stateOf(tool) === 'empty').length;
  return (
    <>
    <details className="v2-strip" data-status={pill.kind} data-testid={run === undefined ? undefined : `run-${run.runId}`}>
      <summary>
        <span className={`v2-pill v2-pill-${pill.kind} v2-strip-status`} title={pill.title}>
          {pill.label.toUpperCase()}
        </span>
        {/* A state that LOOKS like a failure says on the page what it
            means. `DISCONNECTED` in alarm colour, with the explanation
            hidden in a `title`, told a lawyer something had gone wrong and
            gave them no way to learn it probably had not — nobody hovers an
            alarming word to find out it is benign. */}
        {pill.title === undefined ? null : <span className="v2-strip-meaning">{pill.title}</span>}
        {stripLine(turn) === '' ? null : <span className="v2-strip-summary">{stripLine(turn)}</span>}
        {failed === 0 ? null : <span className="v2-strip-failed">{failed === 1 ? '1 failed' : `${failed} failed`}</span>}
        {empty === 0 ? null : <span className="v2-strip-empty">{empty === 1 ? '1 empty' : `${empty} empty`}</span>}
        <span className="v2-chevron" aria-hidden="true">
          details <Chevron />
        </span>
      </summary>

      <div className="v2-strip-body">
        <h4>Steps</h4>
        {turn.tools.length === 0 ? <p className="muted">No tools ran.</p> : <Steps tools={turn.tools} ms={ms} onOpenFile={onOpenFile} />}

        {run === undefined ? null : (
          <dl className="v2-record">
            {/* The collapsed line is a hairline now, not a ledger: the model
                and the duration live HERE, where a reader who opened the
                record came looking for them. */}
            <dt>Model</dt>
            <dd>
              {provider === '' ? 'no provider' : <code>{provider}</code>}
              {/* Why this model and not another (routing-and-evals spec §6):
                  the scoreboard's pick, a pin, the route, or the default —
                  and whether the matter's policy bound the choice. */}
              {run.routeReason === undefined ? null : (
                <span className="v2-record-route">
                  {' · '}
                  {run.routeReason.text}
                  {run.policy === 'stays-local' && run.routeReason.kind !== 'stays-local' ? ' · stays on this machine' : ''}
                </span>
              )}
            </dd>
            {run.durationMs === undefined ? null : (
              <>
                <dt>Duration</dt>
                <dd>{formatMs(run.durationMs)}</dd>
              </>
            )}
            {task === undefined ? null : (
              <>
                <dt>Task</dt>
                <dd className="v2-record-task">
                  {task.task}
                  {sourceWord(task.source) === '' ? null : <span className="v2-record-source"> · {sourceWord(task.source)}</span>}
                  {canAct ? (
                    <>
                      {' · '}
                      <TaskPicker current={task.task} onPick={doTask} />
                    </>
                  ) : null}
                </dd>
              </>
            )}
            <dt>Primitives read</dt>
            <dd>{run.primitivesRead.length === 0 ? 'none' : run.primitivesRead.join(', ')}</dd>
            <dt>Proposals</dt>
            <dd>
              {run.proposals.length === 0
                ? 'none'
                : run.proposals.map(id => (
                    <code key={id} className="v2-record-id" title={id}>
                      {shortId(id)}
                    </code>
                  ))}
            </dd>
            {run.usage === undefined ? null : (
              <>
                <dt>Usage</dt>
                <dd>
                  {run.usage.inputTokens} in / {run.usage.outputTokens} out
                  {run.costUsd === undefined ? '' : ' · '}
                  {run.costUsd === undefined ? null : <span className="v2-record-cost">{formatCost(run.costUsd)}</span>}
                </dd>
              </>
            )}
            <dt>Run</dt>
            <dd>
              <code title={run.runId}>{shortId(run.runId)}</code>
            </dd>
          </dl>
        )}

        {/* The turn owns the error text. `run.error` / `run.errorText` are
            the very same pair the stream's `error` frame put on the turn
            (the loop finalizes the record from that frame), so a turn that
            carries one already shows it above, unfolded — repeating it here
            reads as two failures. The record keeps its copy for the turn
            that has none: a run that failed after the stream was gone. */}
        {run?.error === undefined || turn.error !== undefined ? null : (
          <div className="v2-notice v2-notice-error">
            <p>{run.error}</p>
            {run.errorText === undefined ? null : <pre>{run.errorText}</pre>}
          </div>
        )}
      </div>
    </details>
    {/* The lawyer's mark: two set-text words under the strip, the chosen one
        set in the text weight (`aria-pressed`), never a thumbs pair of icons.
        Only a finished run can be marked, and only from inside its thread. */}
    {canAct ? (
      <p className="v2-marks">
        <button type="button" className="v2-link" aria-pressed={mark?.mark === 'useful'} disabled={busy} onClick={() => doMark('useful')}>
          useful
        </button>
        {' · '}
        <button type="button" className="v2-link" aria-pressed={mark?.mark === 'not-right'} disabled={busy} onClick={() => doMark('not-right')}>
          not right
        </button>
        {/* A review is the one answer that can become a fixture: it has
            findings to expect and a document to score them against. */}
        {(task?.task ?? 'chat') === 'review' ? (
          <>
            {' · '}
            <button type="button" className="v2-link" aria-expanded={fixturing} disabled={busy} onClick={() => setFixturing(f => !f)}>
              make this a fixture
            </button>
          </>
        ) : null}
        {postFailed === null ? null : (
          <span className="v2-marks-failed" role="alert">
            {' — '}
            {postFailed}
          </span>
        )}
      </p>
    ) : null}
    {canAct && fixturing && run !== undefined && threadId !== null ? (
      <FixturePanel threadId={threadId} runId={run.runId} onClose={() => setFixturing(false)} />
    ) : null}
    </>
  );
}
