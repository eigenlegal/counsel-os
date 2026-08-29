import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, fetchJson, streamStep } from '../api/client';
import type { Health, RunRecord, Thread } from '../api/types';
import { Composer } from './Composer';
import { TurnView } from './TurnView';
import { applyStepEvent, buildTurns, emptyAssistantTurn, type AssistantTurn, type Turn } from './turns';

export interface ChatProps {
  threadId: string;
  health: Health;
  /** Lets the shell refresh the thread list after a step renames or touches
   * a thread. */
  onThreadTouched?: () => void;
}

function detail(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/**
 * One thread: its transcript, the turn currently streaming, and the composer.
 *
 * History and the live turn are deliberately separate pieces of state. The
 * transcript is whatever `GET /threads/:id` last returned — the server's
 * record, never patched locally — and the live turn is the stream's, held
 * apart until the step ends and the thread is refetched. Nothing has to
 * reconcile a locally-invented event with the durable log, because the page
 * never invents one.
 */
export function Chat({ threadId, health, onThreadTouched }: ChatProps): JSX.Element {
  const [thread, setThread] = useState<Thread | null>(null);
  const [runs, setRuns] = useState<RunRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /** The message just sent, shown as a user turn before the server's copy of
   * it comes back with the next load. */
  const [pending, setPending] = useState<string | null>(null);
  const [live, setLive] = useState<AssistantTurn | null>(null);

  /**
   * Turns that were streamed but are NOT in the transcript on screen, because
   * the refetch that should have replaced them failed. They are rendered
   * after the server's turns and dropped by the next successful load.
   *
   * They exist so that a failed refresh costs the reader nothing and the
   * writer nothing either: `live` is what disables the composer and arms
   * Stop, so a finished step parked there forever would wedge the box shut
   * with a Stop button that aborts nothing.
   */
  const [frozen, setFrozen] = useState<Turn[]>([]);

  const abort = useRef<AbortController | null>(null);
  const transcript = useRef<HTMLDivElement | null>(null);

  /** `live` as of right now, for the code that has to read it outside a
   * render — the stream's own updates and the freeze below. State would be a
   * render behind at both. */
  const liveRef = useRef<AssistantTurn | null>(null);

  const showLive = (next: AssistantTurn | null): void => {
    liveRef.current = next;
    setLive(next);
  };

  /**
   * The load whose answer is allowed to win. Two reloads can be in flight at
   * once — a card's Reload while the end-of-stream refetch is still running,
   * or two impatient clicks — and the network does not promise to answer them
   * in order. Each load takes a ticket; a load whose ticket is no longer the
   * latest drops its result instead of overwriting a newer transcript with an
   * older one.
   */
  const seq = useRef(0);

  /**
   * Refetches everything and installs it in ONE pass: transcript, runs, the
   * frozen turns dropped, and the live turn cleared together. Two passes
   * would draw a frame in which the server's copy of a turn and the streamed
   * one are both on screen — the same answer, twice, flashing.
   *
   * The live turn is only cleared when no step is running (`abort.current`),
   * so a Reload from a card inside a streaming turn refreshes the history
   * underneath it without wiping the turn being written.
   *
   * Returns whether this call installed a transcript: `false` means the
   * refetch failed and the caller still owns whatever it was going to hand
   * over. A superseded load returns `true` — it installed nothing, but the
   * newer load that replaced it owns the outcome.
   */
  const load = useCallback(async (): Promise<boolean> => {
    const ticket = ++seq.current;
    setError(null);
    try {
      // Both, together: a transcript without its runs would render turns
      // whose run panels pop in a moment later.
      const [next, nextRuns] = await Promise.all([
        fetchJson<Thread>(`/threads/${encodeURIComponent(threadId)}`),
        fetchJson<RunRecord[]>(`/runs?thread=${encodeURIComponent(threadId)}`),
      ]);
      if (ticket !== seq.current) return true;
      setThread(next);
      setRuns(nextRuns);
      setFrozen([]);
      if (abort.current === null) {
        showLive(null);
        setPending(null);
      }
      setLoading(false);
      return true;
    } catch (err) {
      if (ticket !== seq.current) return true;
      // A 401 is already on screen as the whole-page message; anything else
      // belongs here, next to the thread it happened to.
      if (!(err instanceof ApiError && err.status === 401)) setError(detail(err));
      setLoading(false);
      return false;
    }
  }, [threadId]);

  useEffect(() => {
    setLoading(true);
    setThread(null);
    setRuns([]);
    setFrozen([]);
    showLive(null);
    setPending(null);
    void load();
  }, [load]);

  // Stop the stream when the thread changes or the page goes away, so an
  // abandoned run is abandoned promptly rather than at the browser's leisure.
  useEffect(() => () => abort.current?.abort(), [threadId]);

  useEffect(() => {
    const el = transcript.current;
    if (el !== null) el.scrollTop = el.scrollHeight;
  }, [thread, live, pending, frozen]);

  const send = async (message: string, provider: string): Promise<void> => {
    const controller = new AbortController();
    abort.current = controller;
    setError(null);
    setPending(message);
    showLive(emptyAssistantTurn());

    try {
      await streamStep(
        threadId,
        { message, provider },
        event => {
          const base = liveRef.current ?? emptyAssistantTurn();
          // The run id arrives on every frame; keep the first one so the
          // panel can find this turn's record after the refetch.
          const tagged = base.runId === undefined && event.runId !== undefined ? { ...base, runId: event.runId } : base;
          showLive(applyStepEvent(tagged, event));
        },
        controller.signal,
      );
    } catch (err) {
      // An abort is the Stop button, not a failure: the run is abandoned and
      // the reload below shows it that way. The signal is the reliable
      // witness — what a fetch throws on abort varies by runtime.
      if (!controller.signal.aborted) {
        showLive(applyStepEvent(liveRef.current ?? emptyAssistantTurn(), { type: 'error', message: detail(err) }));
        setError(detail(err));
      }
    } finally {
      // Cleared BEFORE the refetch, so `load` knows the step is over and can
      // retire the live turn in the same pass that installs the transcript
      // containing it.
      abort.current = null;
      // The server's transcript is now the truth — including the events the
      // stream suppressed and the run record's final status.
      if (!(await load())) {
        // The refresh failed, so the server's copy of this turn never
        // arrived. Park the streamed one instead of leaving it live: the
        // step is over, and the composer has to work again. The error banner
        // offers Retry, and a successful load drops what is parked here.
        const streamed = liveRef.current;
        setFrozen(current => [
          ...current,
          { kind: 'user', content: message },
          ...(streamed === null ? [] : [streamed]),
        ]);
        showLive(null);
        setPending(null);
      }
      onThreadTouched?.();
    }
  };

  const stop = (): void => abort.current?.abort();
  const reload = (): void => void load();

  const runById = new Map(runs.map(run => [run.runId, run]));
  const turns: Turn[] = thread === null ? [] : buildTurns(thread.events);
  const streaming = live !== null;
  const empty = !loading && turns.length === 0 && frozen.length === 0 && pending === null;

  return (
    <section className="chat">
      <div className="transcript" ref={transcript}>
        {loading ? <p className="muted">Loading…</p> : null}
        {empty ? <p className="muted">No messages yet. Ask counsel something.</p> : null}

        {turns.map((turn, i) => (
          <TurnView
            key={i}
            turn={turn}
            threadId={threadId}
            {...(turn.kind === 'assistant' && turn.runId !== undefined && runById.has(turn.runId)
              ? { run: runById.get(turn.runId)! }
              : {})}
            onReload={reload}
          />
        ))}

        {frozen.map((turn, i) => (
          <TurnView key={`frozen-${i}`} turn={turn} threadId={threadId} onReload={reload} />
        ))}

        {pending === null ? null : <TurnView turn={{ kind: 'user', content: pending }} threadId={threadId} onReload={reload} />}
        {live === null ? null : <TurnView turn={live} threadId={threadId} live onReload={reload} />}
      </div>

      {error === null ? null : (
        <div className="notice notice-error chat-error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={reload}>
            Retry
          </button>
        </div>
      )}

      <Composer
        providers={health.providers}
        defaultProvider={health.default}
        streaming={streaming}
        onSend={(message, provider) => void send(message, provider)}
        onStop={stop}
      />
    </section>
  );
}
