/**
 * Running steps, keyed by thread — and owned by nobody's component.
 *
 * The chat pane is re-keyed when you switch conversations, so anything it
 * held was thrown away: the old thread's stream was aborted and the run
 * recorded `abandoned`. That is a real loss — a review that took ninety
 * seconds, discarded because you looked at something else while it worked.
 *
 * A step lives here instead. It starts when the composer sends, keeps
 * writing whether or not anyone is looking, and finishes into an entry the
 * pane picks up when it comes back. The runtime already allows this: its
 * step lock is per thread, so two conversations run at once and only two
 * steps in ONE conversation queue.
 *
 * The entry is deliberately short-lived. It holds the answer as it arrives;
 * once the pane reloads that thread from the server, the transcript is the
 * record and the entry is dropped.
 */
import { ApiError, streamStep } from '../../api/client';
import type { StreamEvent } from '../../api/types';
import { applyStepEvent, emptyAssistantTurn, type AssistantTurn } from '../../chat/turns';

export interface Stream {
  threadId: string;
  /** The user's message this step is answering, shown above the answer. */
  pending: string;
  /** The answer as it stands. */
  turn: AssistantTurn;
  /** Milliseconds per tool id, measured call → result. */
  ms: Record<string, number>;
  status: 'running' | 'done' | 'stopped' | 'error';
  /** Set when the step failed; the pane shows it and offers what it can. */
  error: string | null;
  /** The runtime refused the step for the matter's privacy policy: there is
   * nothing to retry into, so the sentence is the whole answer. */
  refused: boolean;
}

interface Entry extends Stream {
  controller: AbortController;
  started: Map<string, number>;
}

const entries = new Map<string, Entry>();
const listeners = new Set<() => void>();

/**
 * The running set, as ONE array that only changes identity when the set
 * does. `useSyncExternalStore` compares snapshots with `Object.is`, so a
 * getter that builds a fresh array on every render is an infinite loop.
 */
let runningIds: string[] = [];

function announce(): void {
  const next = [...entries.values()].filter(e => e.status === 'running').map(e => e.threadId);
  if (next.length !== runningIds.length || next.some((id, i) => id !== runningIds[i])) runningIds = next;
  for (const fn of [...listeners]) fn();
}

/** Every subscriber hears about every change: there are a handful of them,
 * and a per-thread channel would still have to tell the rail. */
export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function streamOf(threadId: string | null): Stream | null {
  return threadId === null ? (entries.get(DRAFT) ?? null) : (entries.get(threadId) ?? null);
}

/** The threads with a step in flight — the rail's running marks. */
export function running(): readonly string[] {
  return runningIds;
}

/**
 * Where a send lands before its thread exists. `POST /threads` and the step
 * are one act to the reader, and the composer has to lock for both, so the
 * entry is opened under this key and moved once the id comes back.
 */
export const DRAFT = '@draft';

export function open(threadId: string | null, message: string): void {
  const key = threadId ?? DRAFT;
  entries.set(key, {
    threadId: key,
    pending: message,
    turn: emptyAssistantTurn(),
    ms: {},
    status: 'running',
    error: null,
    refused: false,
    controller: new AbortController(),
    started: new Map(),
  });
  announce();
}

/** The draft's entry becomes the new thread's. */
export function rename(threadId: string): void {
  const draft = entries.get(DRAFT);
  if (draft === undefined) return;
  entries.delete(DRAFT);
  entries.set(threadId, { ...draft, threadId });
  announce();
}

export function signalOf(threadId: string | null): AbortSignal | undefined {
  return entries.get(threadId ?? DRAFT)?.controller.signal;
}

export function stop(threadId: string | null): void {
  entries.get(threadId ?? DRAFT)?.controller.abort();
}

/** Drop the entry — the pane has reloaded the thread and the server's
 * transcript is now the record. */
export function forget(threadId: string | null): void {
  if (entries.delete(threadId ?? DRAFT)) announce();
}

function patch(key: string, change: Partial<Entry>): void {
  const entry = entries.get(key);
  if (entry === undefined) return;
  entries.set(key, { ...entry, ...change });
  announce();
}

/** The sentence a failure reads as. */
export function detailOf(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  return err instanceof Error ? err.message : String(err);
}

/**
 * Runs the step, writing into the entry as it goes. Resolves when the step
 * is over, however it ended — the caller reloads the thread if it is still
 * on screen, and the entry carries the ending for a caller that is not.
 *
 * `open` must have been called first: the composer locks on the entry
 * existing, and arming that only after `POST /threads` returned would leave
 * the box live for a second send that opens a second thread.
 */
export async function run(threadId: string, message: string, provider: string): Promise<void> {
  const entry = entries.get(threadId);
  if (entry === undefined) return;
  const { controller, started } = entry;

  try {
    await streamStep(
      threadId,
      { message, provider },
      (event: StreamEvent) => {
        const live = entries.get(threadId);
        if (live === undefined) return;
        if (event.type === 'tool_call') started.set(event.id, performance.now());
        if (event.type === 'tool_result') {
          const t0 = started.get(event.id);
          if (t0 !== undefined) patch(threadId, { ms: { ...entries.get(threadId)!.ms, [event.id]: Math.round(performance.now() - t0) } });
        }
        const base = entries.get(threadId)!.turn;
        const tagged = base.runId === undefined && event.runId !== undefined ? { ...base, runId: event.runId } : base;
        patch(threadId, { turn: applyStepEvent(tagged, event) });
      },
      controller.signal,
    );
    patch(threadId, { status: 'done' });
  } catch (err) {
    if (controller.signal.aborted) {
      patch(threadId, { status: 'stopped' });
      return;
    }
    // The runtime refused the step for the matter's privacy policy (409
    // matter-stays-local): nothing ran and there is nothing to retry into,
    // so the sentence is the whole answer.
    const body = err instanceof ApiError && err.status === 409 ? (err.body as { error?: string; message?: string } | null) : null;
    if (body?.error === 'matter-stays-local') {
      patch(threadId, { status: 'error', refused: true, error: body.message ?? 'This matter stays on this machine.' });
      return;
    }
    const message = detailOf(err);
    patch(threadId, {
      status: 'error',
      error: message,
      turn: applyStepEvent(entries.get(threadId)?.turn ?? emptyAssistantTurn(), { type: 'error', message }),
    });
  }
}

/** Tests only: no entry survives one. */
export function reset(): void {
  for (const entry of entries.values()) entry.controller.abort();
  entries.clear();
  listeners.clear();
  runningIds = [];
}
