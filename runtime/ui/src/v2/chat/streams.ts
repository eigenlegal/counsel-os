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

export function streamOf(key: string): Stream | null {
  return entries.get(key) ?? null;
}

/** The threads with a step in flight — the rail's running marks. */
export function running(): readonly string[] {
  return runningIds;
}

/**
 * A key for a pane that has no thread yet. `POST /threads` and the step are
 * one act to the reader and the composer locks for both, so the entry opens
 * under this key and is renamed once the id comes back.
 *
 * Per PANE, not one global slot: Home's ask box remounts the chat on a
 * fresh draft, so two drafts can be alive at once, and a shared key would
 * make the second one read the first one's stream — and swallow its send.
 */
export function draftKey(): string {
  return `@draft-${Math.random().toString(36).slice(2)}`;
}

export function open(key: string, message: string): void {
  // A second open on a live key would orphan the first controller — the
  // first stream could never be stopped, and its events would land on the
  // new entry's turn. The UI locks the composer, so this is a backstop.
  entries.get(key)?.controller.abort();
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
export function rename(key: string, threadId: string): void {
  const draft = entries.get(key);
  if (draft === undefined || key === threadId) return;
  entries.delete(key);
  entries.set(threadId, { ...draft, threadId });
  announce();
}

export function signalOf(key: string): AbortSignal | undefined {
  return entries.get(key)?.controller.signal;
}

export function stop(key: string): void {
  entries.get(key)?.controller.abort();
}

/** Drop the entry — the pane has reloaded the thread and the server's
 * transcript is now the record. Does NOT abort: by here the step is over. */
export function forget(key: string): void {
  if (entries.delete(key)) announce();
}

/** Stop the step AND drop it: the conversation is gone. Without this a
 * deleted thread's step runs to completion against a thread that no longer
 * exists — real money on a cloud provider, with no screen left to stop it. */
export function cancel(key: string): void {
  entries.get(key)?.controller.abort();
  forget(key);
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
  /**
   * Still ours? `patch` writes by KEY, so a run whose entry has since been
   * replaced — a second send on the same thread — would stamp its own
   * ending onto the new entry, marking a live stream `stopped` and dropping
   * an answer still arriving.
   */
  const mine = (): boolean => entries.get(threadId)?.controller === controller;

  try {
    await streamStep(
      threadId,
      { message, provider },
      (event: StreamEvent) => {
        if (!mine()) return;
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
    if (mine()) patch(threadId, { status: 'done' });
  } catch (err) {
    if (!mine()) return;
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
