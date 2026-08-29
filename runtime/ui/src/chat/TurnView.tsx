import type { RunRecord } from '../api/types';
import { ProposalCard } from './ProposalCard';
import { RunPanel } from './RunPanel';
import { ToolCard } from './ToolCard';
import type { Turn } from './turns';

export interface TurnViewProps {
  turn: Turn;
  threadId: string;
  /** The record for this turn's run, once `GET /runs?thread=` has it. A live
   * turn has none until the step ends. */
  run?: RunRecord;
  /** True only for the turn currently streaming, so a finished turn from the
   * log never shows a working indicator. */
  live?: boolean;
  onReload: () => void;
}

/**
 * One turn of the transcript: the user's message, or the assistant's answer
 * with everything that produced it — the tools it ran, the proposals it
 * raised, any warning the run recovered from, and the run record underneath.
 *
 * The same component renders history and the live turn. Grouping happens in
 * `turns.ts`, so a streamed turn and a reloaded one are the same shape and
 * cannot drift apart.
 */
export function TurnView({ turn, threadId, run, live = false, onReload }: TurnViewProps): JSX.Element {
  if (turn.kind === 'user') {
    return (
      <article className="turn turn-user">
        <p className="turn-text">{turn.content}</p>
      </article>
    );
  }

  return (
    <article className="turn turn-assistant">
      {turn.warnings.map((message, i) => (
        <p className="notice notice-warning" key={`warning-${i}`} role="status">
          {message}
        </p>
      ))}

      {turn.tools.map(tool => (
        <ToolCard key={tool.id} tool={tool} />
      ))}

      {turn.text === '' ? null : <p className="turn-text">{turn.text}</p>}

      {turn.proposals.map(proposal => (
        <ProposalCard key={proposal.id} threadId={threadId} proposal={proposal} onReload={onReload} />
      ))}

      {turn.error === undefined ? null : (
        <div className="notice notice-error" role="alert">
          <p>{turn.error.message}</p>
          {/* Spec §4.3: a typed step that could not honor its schema is an
              error, but the model's raw answer is still worth reading. */}
          {turn.error.text === undefined ? null : <pre>{turn.error.text}</pre>}
        </div>
      )}

      {live && turn.status === 'streaming' ? (
        <p className="working" role="status">
          working…
        </p>
      ) : null}

      {run === undefined ? null : <RunPanel run={run} />}
    </article>
  );
}
