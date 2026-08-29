import type { RunRecord } from '../api/types';

/**
 * The run record for one assistant turn (spec §2, "Run record surface"): what
 * counsel read, ran, proposed, produced and cost. The plugin cannot show any
 * of this; the point of the page is that a lawyer can check the work.
 *
 * Collapsed by default — it is evidence, not the answer — and it renders from
 * `GET /runs?thread=`, refetched when a step ends.
 */
export function RunPanel({ run }: { run: RunRecord }): JSX.Element {
  return (
    <details className="run-panel" data-testid={`run-${run.runId}`}>
      <summary>
        <span className={`badge badge-${run.status}`}>{run.status}</span>
        <span className="run-provider">{run.provider === '' ? 'no provider' : run.provider}</span>
        {run.durationMs === undefined ? null : <span className="run-duration">{formatMs(run.durationMs)}</span>}
        {run.costUsd === undefined ? null : <span className="run-cost">{formatCost(run.costUsd)}</span>}
      </summary>

      <dl className="run-facts">
        {run.task === undefined ? null : (
          <>
            <dt>Task</dt>
            <dd>{run.task}</dd>
          </>
        )}
        <dt>Primitives read</dt>
        <dd>{run.primitivesRead.length === 0 ? 'none' : run.primitivesRead.join(', ')}</dd>
        {run.usage === undefined ? null : (
          <>
            <dt>Tokens</dt>
            <dd>
              {run.usage.inputTokens} in / {run.usage.outputTokens} out
            </dd>
          </>
        )}
      </dl>

      <h4>Tools</h4>
      {run.toolCalls.length === 0 ? (
        <p className="muted">No tools ran.</p>
      ) : (
        <ul className="run-tools">
          {run.toolCalls.map((call, i) => (
            <li key={`${call.name}-${i}`}>
              <span className="tool-name">{call.name}</span>
              {/* `null` ms means the call never paired with a result — an
                  unknown duration, which must not read as a measured 0. */}
              <span className="tool-ms">{call.ms === null ? 'unknown' : `${call.ms} ms`}</span>
              {call.isError === true ? <span className="badge badge-error">error</span> : null}
            </li>
          ))}
        </ul>
      )}

      <h4>Proposals</h4>
      {run.proposals.length === 0 ? (
        <p className="muted">No proposals.</p>
      ) : (
        <ul className="run-proposals">
          {run.proposals.map(id => (
            <li key={id}>
              <code>{id}</code>
            </li>
          ))}
        </ul>
      )}

      {run.error === undefined ? null : (
        <div className="notice notice-error">
          <p>{run.error}</p>
          {/* The model's raw answer when a typed step could not honor its
              schema (spec §4.3) — the request failed, the words survive. */}
          {run.errorText === undefined ? null : <pre>{run.errorText}</pre>}
        </div>
      )}
    </details>
  );
}

function formatMs(ms: number): string {
  return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`;
}

/** Sub-cent runs are the common case, so a plain 2-decimal dollar amount
 * would read as free for almost every step. */
function formatCost(usd: number): string {
  return usd === 0 ? '$0' : usd < 0.01 ? `$${usd.toFixed(4)}` : `$${usd.toFixed(2)}`;
}
