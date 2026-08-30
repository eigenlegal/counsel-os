import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, fetchJson, streamStep } from '../../api/client';
import type { Health, RunRecord, Thread, ThreadHeader } from '../../api/types';
import { applyStepEvent, buildTurns, emptyAssistantTurn, type AssistantTurn, type Turn } from '../../chat/turns';
import { createThread, titleFor } from '../threads';
import { Composer } from './Composer';
import { TurnView } from './Turn';

export interface ChatProps {
  /** `null` is a draft: no thread exists until the first send creates one
   * with the message's first line as its title. */
  threadId: string | null;
  health: Health;
  /** The draft became a thread. The shell selects it WITHOUT re-keying this
   * component — a remount here would drop the stream in flight. */
  onThreadCreated?: (header: ThreadHeader) => void;
  onThreadTouched?: () => void;
  onOpenFile?: (path: string) => void;
}

function detail(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/**
 * One thread: its transcript, the turn currently streaming, and the composer.
 *
 * History and the live turn are separate state. The transcript is whatever
 * `GET /threads/:id` last returned — never patched locally — and the live
 * turn is the stream's, held apart until the step ends and the thread is
 * refetched. `load` owns retiring the live turn (`settle`), on both its
 * paths, so any load that ends up owning a finished stream hands the
 * composer back.
 */
export function Chat({ threadId: initialThreadId, health, onThreadCreated, onThreadTouched, onOpenFile }: ChatProps): JSX.Element {
  /** The thread this pane is about. A ref, not only state: `load` and
   * `send` read it outside a render, and it changes exactly once — from
   * `null` to the id the first send created. Switching THREADS is the
   * shell's job, by re-keying this component. */
  const idRef = useRef<string | null>(initialThreadId);
  const [threadId, setThreadId] = useState<string | null>(initialThreadId);

  const [thread, setThread] = useState<Thread | null>(null);
  const [runs, setRuns] = useState<RunRecord[]>([]);
  const [loading, setLoading] = useState(initialThreadId !== null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [live, setLive] = useState<AssistantTurn | null>(null);
  const [frozen, setFrozen] = useState<Turn[]>([]);
  /** Milliseconds per tool id for the live turn, measured call → result. */
  const [liveMs, setLiveMs] = useState<Record<string, number>>({});

  const abort = useRef<AbortController | null>(null);
  const transcript = useRef<HTMLDivElement | null>(null);
  const liveRef = useRef<AssistantTurn | null>(null);
  const pendingRef = useRef<string | null>(null);
  const started = useRef<Map<string, number>>(new Map());
  const seq = useRef(0);

  const showLive = (next: AssistantTurn | null): void => {
    liveRef.current = next;
    setLive(next);
  };
  const showPending = (next: string | null): void => {
    pendingRef.current = next;
    setPending(next);
  };

  /** Retires a finished stream's turn: dropped (`keep === false`, a load
   * installed a transcript containing it) or parked in `frozen` (`true`,
   * the load failed and the transcript on screen does not have it). Does
   * nothing while a step is running — the stream owns `live` then. */
  const settle = (keep: boolean): void => {
    if (abort.current !== null) return;
    const streamed = liveRef.current;
    const asked = pendingRef.current;
    if (streamed === null && asked === null) return;
    if (keep) {
      setFrozen(current => [
        ...current,
        ...(asked === null ? [] : [{ kind: 'user', content: asked } as Turn]),
        ...(streamed === null ? [] : [streamed]),
      ]);
    }
    showLive(null);
    showPending(null);
  };

  const load = useCallback(async (): Promise<void> => {
    const id = idRef.current;
    if (id === null) {
      setLoading(false);
      return;
    }
    const ticket = ++seq.current;
    setError(null);
    try {
      const [next, nextRuns] = await Promise.all([
        fetchJson<Thread>(`/threads/${encodeURIComponent(id)}`),
        fetchJson<RunRecord[]>(`/runs?thread=${encodeURIComponent(id)}`),
      ]);
      if (ticket !== seq.current) return;
      setThread(next);
      setRuns(nextRuns);
      setFrozen([]);
      settle(false);
      setLoading(false);
    } catch (err) {
      if (ticket !== seq.current) return;
      if (!(err instanceof ApiError && err.status === 401)) setError(detail(err));
      settle(true);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => () => abort.current?.abort(), []);

  useEffect(() => {
    const el = transcript.current;
    if (el !== null) el.scrollTop = el.scrollHeight;
  }, [thread, live, pending, frozen]);

  const send = async (message: string, provider: string): Promise<void> => {
    setError(null);
    showPending(message);

    if (idRef.current === null) {
      try {
        const header = await createThread({ title: titleFor(message) });
        idRef.current = header.id;
        setThreadId(header.id);
        onThreadCreated?.(header);
      } catch (err) {
        if (!(err instanceof ApiError && err.status === 401)) setError(`could not start the thread: ${detail(err)}`);
        // No step ran. The message stays on screen (frozen) and the box is free.
        settle(true);
        return;
      }
    }
    const id = idRef.current;

    const controller = new AbortController();
    abort.current = controller;
    started.current = new Map();
    setLiveMs({});
    showLive(emptyAssistantTurn());

    try {
      await streamStep(
        id,
        { message, provider },
        event => {
          if (event.type === 'tool_call') started.current.set(event.id, performance.now());
          if (event.type === 'tool_result') {
            const callId = event.id;
            const t0 = started.current.get(callId);
            if (t0 !== undefined) {
              const ms = Math.round(performance.now() - t0);
              setLiveMs(current => ({ ...current, [callId]: ms }));
            }
          }
          const base = liveRef.current ?? emptyAssistantTurn();
          const tagged = base.runId === undefined && event.runId !== undefined ? { ...base, runId: event.runId } : base;
          showLive(applyStepEvent(tagged, event));
        },
        controller.signal,
      );
    } catch (err) {
      if (!controller.signal.aborted) {
        showLive(applyStepEvent(liveRef.current ?? emptyAssistantTurn(), { type: 'error', message: detail(err) }));
        setError(detail(err));
      }
    } finally {
      abort.current = null;
      await load();
      onThreadTouched?.();
    }
  };

  const stop = (): void => abort.current?.abort();
  const reload = (): void => void load();

  const runById = new Map(runs.map(run => [run.runId, run]));
  const turns: Turn[] = thread === null ? [] : buildTurns(thread.events);
  const streaming = live !== null;
  const isDraft = threadId === null && pending === null && frozen.length === 0;
  const empty = !loading && threadId !== null && turns.length === 0 && frozen.length === 0 && pending === null;

  return (
    <section className="v2-chat">
      <div className="v2-transcript" ref={transcript}>
        {loading ? <p className="muted v2-empty">Loading…</p> : null}
        {isDraft ? <p className="muted v2-empty">New conversation. Ask counsel something — the thread is created when you send.</p> : null}
        {empty ? <p className="muted v2-empty">No messages yet. Ask counsel something.</p> : null}

        {turns.map((turn, i) => (
          <TurnView
            key={i}
            turn={turn}
            threadId={threadId}
            {...(turn.kind === 'assistant' && turn.runId !== undefined && runById.has(turn.runId) ? { run: runById.get(turn.runId)! } : {})}
            onReload={reload}
            onOpenFile={onOpenFile}
          />
        ))}
        {frozen.map((turn, i) => (
          <TurnView key={`frozen-${i}`} turn={turn} threadId={threadId} onReload={reload} onOpenFile={onOpenFile} />
        ))}
        {pending === null ? null : <TurnView turn={{ kind: 'user', content: pending }} threadId={threadId} onReload={reload} />}
        {live === null ? null : <TurnView turn={live} threadId={threadId} live liveMs={liveMs} onReload={reload} onOpenFile={onOpenFile} />}
      </div>

      {error === null ? null : (
        <div className="v2-notice v2-notice-error v2-chat-error" role="alert">
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
