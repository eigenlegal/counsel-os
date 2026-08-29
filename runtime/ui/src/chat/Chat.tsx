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
  const abort = useRef<AbortController | null>(null);
  const transcript = useRef<HTMLDivElement | null>(null);

  const load = useCallback(async (): Promise<void> => {
    setError(null);
    try {
      // Both, together: a transcript without its runs would render turns
      // whose run panels pop in a moment later.
      const [next, nextRuns] = await Promise.all([
        fetchJson<Thread>(`/threads/${encodeURIComponent(threadId)}`),
        fetchJson<RunRecord[]>(`/runs?thread=${encodeURIComponent(threadId)}`),
      ]);
      setThread(next);
      setRuns(nextRuns);
    } catch (err) {
      // A 401 is already on screen as the whole-page message; anything else
      // belongs here, next to the thread it happened to.
      if (!(err instanceof ApiError && err.status === 401)) setError(detail(err));
    } finally {
      setLoading(false);
    }
  }, [threadId]);

  useEffect(() => {
    setLoading(true);
    setThread(null);
    setRuns([]);
    setLive(null);
    setPending(null);
    void load();
  }, [load]);

  // Stop the stream when the thread changes or the page goes away, so an
  // abandoned run is abandoned promptly rather than at the browser's leisure.
  useEffect(() => () => abort.current?.abort(), [threadId]);

  useEffect(() => {
    const el = transcript.current;
    if (el !== null) el.scrollTop = el.scrollHeight;
  }, [thread, live, pending]);

  const send = async (message: string, provider: string): Promise<void> => {
    const controller = new AbortController();
    abort.current = controller;
    setError(null);
    setPending(message);
    setLive(emptyAssistantTurn());

    try {
      await streamStep(
        threadId,
        { message, provider },
        event => {
          setLive(current => {
            const base = current ?? emptyAssistantTurn();
            // The run id arrives on every frame; keep the first one so the
            // panel can find this turn's record after the refetch.
            const tagged = base.runId === undefined && event.runId !== undefined ? { ...base, runId: event.runId } : base;
            return applyStepEvent(tagged, event);
          });
        },
        controller.signal,
      );
    } catch (err) {
      // An abort is the Stop button, not a failure: the run is abandoned and
      // the reload below shows it that way. The signal is the reliable
      // witness — what a fetch throws on abort varies by runtime.
      if (!controller.signal.aborted) {
        setLive(current => applyStepEvent(current ?? emptyAssistantTurn(), { type: 'error', message: detail(err) }));
        setError(detail(err));
      }
    } finally {
      abort.current = null;
      // The server's transcript is now the truth — including the events the
      // stream suppressed and the run record's final status.
      await load();
      setLive(null);
      setPending(null);
      onThreadTouched?.();
    }
  };

  const stop = (): void => abort.current?.abort();

  const runById = new Map(runs.map(run => [run.runId, run]));
  const turns: Turn[] = thread === null ? [] : buildTurns(thread.events);
  const streaming = live !== null;

  return (
    <section className="chat">
      <div className="transcript" ref={transcript}>
        {loading ? <p className="muted">Loading…</p> : null}
        {!loading && turns.length === 0 && pending === null ? (
          <p className="muted">No messages yet. Ask counsel something.</p>
        ) : null}

        {turns.map((turn, i) => (
          <TurnView
            key={i}
            turn={turn}
            threadId={threadId}
            {...(turn.kind === 'assistant' && turn.runId !== undefined && runById.has(turn.runId)
              ? { run: runById.get(turn.runId)! }
              : {})}
            onReload={() => void load()}
          />
        ))}

        {pending === null ? null : <TurnView turn={{ kind: 'user', content: pending }} threadId={threadId} onReload={() => void load()} />}
        {live === null ? null : <TurnView turn={live} threadId={threadId} live onReload={() => void load()} />}
      </div>

      {error === null ? null : (
        <p className="notice notice-error" role="alert">
          {error}
        </p>
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
