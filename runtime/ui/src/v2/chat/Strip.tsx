import type { RunRecord, RunStatus } from '../../api/types';
import type { AssistantTurn } from '../../chat/turns';
import { stateOf, summarize } from '../verbs';
import { Steps } from './Steps';

export interface StripProps {
  turn: AssistantTurn;
  /** The run record once `GET /runs?thread=` has it. */
  run?: RunRecord;
  /** Milliseconds per tool id (from the record, or measured live). */
  ms: Record<string, number>;
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

/**
 * A finished turn's work, folded into one line (spec §2, "Turn when
 * finished"): pill · "read 2 files, ran 1 tool" · provider · duration ·
 * tokens · chevron. Open, it is the full record — the steps with show/hide,
 * primitives read, proposals, usage and cost, the run id.
 */
export function Strip({ turn, run, ms, onOpenFile }: StripProps): JSX.Element {
  const pill = pillFor(turn, run);
  const provider = run?.provider !== undefined && run.provider !== '' ? run.provider : (turn.provider ?? '');
  // `summarize` counts by tool NAME, so a failed call is invisible in it.
  // Carried alongside rather than folded in: the count is the collapsed
  // strip's only hint that something inside it went wrong.
  const failed = turn.tools.filter(tool => stateOf(tool) === 'error').length;
  // Counted apart from the failures: a tool that answered "nothing" did not
  // fail, and saying it did would send the reader looking for a broken tool
  // instead of an empty vault.
  const empty = turn.tools.filter(tool => stateOf(tool) === 'empty').length;
  return (
    <details className="v2-strip" data-status={pill.kind} data-testid={run === undefined ? undefined : `run-${run.runId}`}>
      <summary>
        <span className={`v2-pill v2-pill-${pill.kind}`} title={pill.title}>
          {pill.label}
        </span>
        <span className="v2-strip-summary">{summarize(turn.tools)}</span>
        {failed === 0 ? null : <span className="v2-strip-failed">{failed === 1 ? '1 failed' : `${failed} failed`}</span>}
        {empty === 0 ? null : <span className="v2-strip-empty">{empty === 1 ? '1 empty' : `${empty} empty`}</span>}
        {provider === '' ? null : <span className="v2-strip-provider">{provider}</span>}
        {run?.durationMs === undefined ? null : <span className="v2-strip-duration">{formatMs(run.durationMs)}</span>}
        {run?.usage === undefined ? null : (
          <span className="v2-strip-tokens">
            {run.usage.inputTokens} in / {run.usage.outputTokens} out
          </span>
        )}
        <span className="v2-chevron" aria-hidden="true">
          ›
        </span>
      </summary>

      <div className="v2-strip-body">
        <h4>Steps</h4>
        {turn.tools.length === 0 ? <p className="muted">No tools ran.</p> : <Steps tools={turn.tools} ms={ms} onOpenFile={onOpenFile} />}

        {run === undefined ? null : (
          <dl className="v2-record">
            {/* The summary line is this record's header: it already carries
                the model, the duration and the tokens, so the body lists
                what the header does not — and only names the model when
                there was none to show up there. */}
            {provider === '' ? (
              <>
                <dt>Model</dt>
                <dd>no provider</dd>
              </>
            ) : null}
            {run.task === undefined ? null : (
              <>
                <dt>Task</dt>
                <dd>{run.task}</dd>
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
  );
}
