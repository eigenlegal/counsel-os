import type { RunRecord } from '../../api/types';
import type { ToolCallView, Turn } from '../../chat/turns';
import { ProposalCard } from './ProposalCard';
import { Steps } from './Steps';
import { Strip } from './Strip';

export interface TurnProps {
  turn: Turn;
  /** `null` only while the pane is a draft — no proposal can exist then. */
  threadId: string | null;
  run?: RunRecord;
  /** True only for the turn currently streaming. */
  live?: boolean;
  /** Milliseconds measured by the stream, per tool id, for the live turn. */
  liveMs?: Record<string, number>;
  onReload: () => void;
  onOpenFile?: (path: string) => void;
}

/** The record's per-call timings, keyed onto this turn's tool ids. The
 * record lists calls in order without ids, so it is paired by position and
 * checked by name; a `null` ms (never paired with a result) is left out. */
export function msFromRun(tools: ToolCallView[], run: RunRecord | undefined): Record<string, number> {
  const out: Record<string, number> = {};
  if (run === undefined) return out;
  tools.forEach((tool, i) => {
    const call = run.toolCalls[i];
    if (call !== undefined && call.name === tool.name && call.ms !== null) out[tool.id] = call.ms;
  });
  return out;
}

/**
 * One turn (spec §2): a user bubble, or the assistant's answer FIRST, then
 * its proposals, then the strip. While streaming, the timeline runs above
 * the text so the reader sees the work as it happens.
 */
export function TurnView({ turn, threadId, run, live = false, liveMs = {}, onReload, onOpenFile }: TurnProps): JSX.Element {
  if (turn.kind === 'user') {
    return (
      <article className="v2-turn v2-turn-user">
        <p className="v2-user-text">{turn.content}</p>
      </article>
    );
  }

  const streaming = live && turn.status === 'streaming';
  const ms = { ...msFromRun(turn.tools, run), ...liveMs };

  return (
    <article className={streaming ? 'v2-turn v2-turn-assistant v2-live' : 'v2-turn v2-turn-assistant'}>
      {turn.warnings.map((message, i) => (
        <p className="v2-notice v2-notice-warn" key={`warning-${i}`} role="status">
          {message}
        </p>
      ))}

      {streaming ? (
        <>
          <Steps tools={turn.tools} ms={ms} onOpenFile={onOpenFile} />
          {turn.text === '' ? (
            <p className="v2-working" role="status">
              working…
            </p>
          ) : (
            <p className="v2-prose">{turn.text}</p>
          )}
        </>
      ) : (
        <>
          {turn.text === '' ? null : <p className="v2-prose">{turn.text}</p>}

          {/* The turn owns its error text: it reads here, unfolded, and the
              strip's record leaves out the identical copy it holds. */}
          {turn.error === undefined ? null : (
            <div className="v2-notice v2-notice-error" role="alert">
              <p>{turn.error.message}</p>
              {turn.error.text === undefined ? null : (
                <details>
                  <summary>show answer</summary>
                  <pre>{turn.error.text}</pre>
                </details>
              )}
            </div>
          )}

          {threadId === null
            ? null
            : turn.proposals.map(proposal => (
                <ProposalCard key={proposal.id} threadId={threadId} proposal={proposal} onReload={onReload} onOpenFile={onOpenFile} />
              ))}

          <Strip turn={turn} run={run} ms={ms} onOpenFile={onOpenFile} />
        </>
      )}
    </article>
  );
}
