/**
 * Turning a thread's flat event log into what a lawyer reads: turns.
 *
 * The log is a sequence, not a tree — a `user` event, then a `step` event,
 * then that step's text, tool calls, tool results, proposals and warnings,
 * then the next `user`. Grouping it is pure, so the same code builds the
 * transcript `GET /threads/:id` returns AND the live turn the SSE stream
 * fills in as it arrives; the page never has two ideas of what a turn is.
 *
 * Pairing tool calls with their results by id (not by position) is the point
 * of the exercise: a provider may run several tools before any of them
 * answers, and the card has to show the call and its result together.
 */
import type { ProposalStatus, StepEvent, ThreadEvent } from '../api/types';

export interface ToolCallView {
  id: string;
  name: string;
  input: unknown;
  output?: unknown;
  isError?: boolean;
  /** False while the call is still running — the card says so rather than
   * rendering an empty result. */
  hasResult: boolean;
}

export interface ProposalView {
  id: string;
  path: string;
  rationale: string;
  /** Only the log carries the proposed file; the stream's `proposal` event
   * does not, so a live card shows the path and rationale and gets the
   * content on the next load. */
  content?: string;
  status: ProposalStatus;
}

export interface UserTurn {
  kind: 'user';
  content: string;
  at?: string;
}

export interface AssistantTurn {
  kind: 'assistant';
  /** Absent only for a turn that started before its `step` event — which the
   * server does not do, but a truncated log could. */
  runId?: string;
  provider?: string;
  text: string;
  /** A tool ran since the last text arrived. The next text event is a NEW
   * segment, not a continuation: the Claude harness emits whole text blocks
   * split around tool calls, and joining them bare glues `…activity.` onto
   * `## What changed` so the heading never renders (cou-93 item 1). Streamed
   * deltas within one segment have no tool between them, so they still join
   * seamlessly. */
  toolBreak?: boolean;
  tools: ToolCallView[];
  proposals: ProposalView[];
  warnings: string[];
  error?: { message: string; text?: string };
  status: 'streaming' | 'done' | 'error';
}

export type Turn = UserTurn | AssistantTurn;

export function emptyAssistantTurn(init: Partial<AssistantTurn> = {}): AssistantTurn {
  return {
    kind: 'assistant',
    text: '',
    tools: [],
    proposals: [],
    warnings: [],
    status: 'streaming',
    ...init,
  };
}

/** Fills a `tool_result` into the oldest unanswered call with that id. A
 * result for a call nobody saw becomes its own card rather than being
 * dropped — losing it would hide work the model actually did. */
function withToolResult(turn: AssistantTurn, ev: Extract<StepEvent, { type: 'tool_result' }>): AssistantTurn {
  const tools = [...turn.tools];
  const at = tools.findIndex(t => t.id === ev.id && !t.hasResult);
  const filled: ToolCallView = {
    id: ev.id,
    // Threads persisted before the harness learned to name its results
    // (cou-78) carry `name: ''` — the paired call knows the name, so a
    // nameless result must never overwrite it (cou-93 item 2).
    name: ev.name !== '' || at === -1 ? ev.name : tools[at]!.name,
    input: at === -1 ? undefined : tools[at]!.input,
    output: ev.output,
    isError: ev.isError ?? false,
    hasResult: true,
  };
  if (at === -1) tools.push(filled);
  else tools[at] = filled;
  return { ...turn, tools };
}

/**
 * One step event folded into a turn, immutably — the caller replaces its
 * state with the result, which is what makes React re-render mid-stream.
 */
export function applyStepEvent(turn: AssistantTurn, ev: StepEvent): AssistantTurn {
  switch (ev.type) {
    case 'text': {
      // A paragraph break between segments split around tool work, and only
      // there — see `toolBreak`. Never inside a segment a provider streams
      // as deltas.
      const sep = turn.toolBreak === true && turn.text !== '' && !turn.text.endsWith('\n\n') ? '\n\n' : '';
      return { ...turn, text: turn.text + sep + ev.text, toolBreak: false };
    }
    case 'tool_call':
      return {
        ...turn,
        toolBreak: turn.toolBreak === true || turn.text !== '',
        tools: [...turn.tools, { id: ev.id, name: ev.name, input: ev.input, hasResult: false }],
      };
    case 'tool_result':
      return withToolResult({ ...turn, toolBreak: turn.toolBreak === true || turn.text !== '' }, ev);
    case 'proposal':
      return turn.proposals.some(p => p.id === ev.id)
        ? turn
        : { ...turn, proposals: [...turn.proposals, { id: ev.id, path: ev.path, rationale: ev.rationale, status: 'pending' }] };
    case 'done':
      return { ...turn, status: 'done' };
    case 'error':
      return {
        ...turn,
        status: 'error',
        error: { message: ev.message, ...(ev.text === undefined ? {} : { text: ev.text }) },
      };
    // The vendor session id is bookkeeping for the next step, not something
    // the transcript shows.
    case 'session':
      return turn;
  }
}

/** True for the thread's own events, false for the step events the log
 * embeds — the two use different tag keys (`t` vs `type`). */
function isThreadEvent(ev: ThreadEvent): ev is Exclude<ThreadEvent, StepEvent & { at: string }> {
  return 't' in ev;
}

/**
 * The whole transcript, grouped. A `step` event opens an assistant turn and a
 * `user` event closes it; anything that arrives with no turn open gets one,
 * so a log that begins mid-step still renders.
 */
export function buildTurns(events: ThreadEvent[]): Turn[] {
  const turns: Turn[] = [];
  let current: AssistantTurn | null = null;

  for (const ev of events) {
    if (isThreadEvent(ev)) {
      if (ev.t === 'user') {
        if (current !== null) turns.push(current);
        current = null;
        turns.push({ kind: 'user', content: ev.content, at: ev.at });
        continue;
      }
      if (ev.t === 'step') {
        if (current !== null) turns.push(current);
        current = emptyAssistantTurn({ runId: ev.runId, provider: ev.provider });
        continue;
      }
      const open: AssistantTurn = current ?? emptyAssistantTurn();
      current =
        ev.t === 'warning'
          ? { ...open, warnings: [...open.warnings, ev.message] }
          : {
              ...open,
              proposals: [
                ...open.proposals.filter(p => p.id !== ev.id),
                { id: ev.id, path: ev.path, rationale: ev.rationale, content: ev.content, status: ev.status },
              ],
            };
      continue;
    }
    current = applyStepEvent(current ?? emptyAssistantTurn(), ev);
  }

  if (current !== null) turns.push(current);
  return turns;
}
