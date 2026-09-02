import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, fetchJson, streamStep } from '../../api/client';
import type { Health, RunRecord, Thread, ThreadEvent, ThreadHeader, ThreadPolicy, VaultFile } from '../../api/types';
import { proposalFromHash } from '../../app';
import { applyStepEvent, buildTurns, emptyAssistantTurn, type AssistantTurn, type Turn } from '../../chat/turns';
import { createThread, defaultProviderId, titleFor } from '../threads';
import { relTime } from '../time';
import { prettifyName, readerModel } from '../vault/frontmatter';
import { matterFolderOf } from '../intake';
import { Composer, type ComposerSeed } from './Composer';
import { MatterPicker } from './MatterPicker';
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
  /** A proposal was approved or rejected, on this vault path. */
  onFileDecided?: (path: string) => void;
  onOpenFile?: (path: string) => void;
  /** A composer prefill from another surface — the vault reader's "Ask
   * counsel about this file" (spec §3.4). */
  seed?: ComposerSeed;
  /** The seed was applied — the shell drops it so it fires only once. */
  onSeedUsed?: () => void;
  /**
   * A message to SEND as soon as this pane mounts — home's ask box, which
   * has already committed to asking (spec §3.2). Same one-shot shape as
   * `seed`, and the opposite of it: a seed waits in the box, an ask goes.
   * It runs on the default provider, since home has no picker.
   */
  initialAsk?: ComposerSeed;
  /** The ask was sent — the shell drops it, so a later remount of this pane
   * cannot send it a second time. */
  onAskUsed?: () => void;
  /** Every file path the vault holds (`GET /vault/index`): a path the model
   * writes in an answer becomes a click target only when it is in here. */
  vaultPaths?: ReadonlySet<string>;
  /** The thread's privacy policy as `GET /threads/:id` reports it — the
   * shell passes it to the rail so the switcher greys cloud rows for this
   * thread (providers spec §7). Fires with `null` for a draft. */
  onPolicy?: (policy: ThreadPolicy | null) => void;
}

function detail(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** The thread's own name, or the honest placeholder. A thread created from
 * a message whose first line was blank has a title of `''`, which would
 * render as an empty heading rather than as a thread nobody named. */
function titleOf(header: ThreadHeader): string {
  const title = header.title?.trim() ?? '';
  return title === '' ? 'Untitled' : title;
}

/** Best-effort, client-side (spec §3.3): the thread's matter is the first
 * matter file the thread read. `matters/` is the conventional dir; a vault
 * with a custom `matters_path` just shows no matter line — it is a
 * courtesy, not a record. */
export function matterPathOf(events: ThreadEvent[]): string | null {
  for (const ev of events) {
    if ('t' in ev) continue;
    if (ev.type !== 'tool_call' || ev.name !== 'vault_read') continue;
    const input = ev.input;
    if (typeof input !== 'object' || input === null) continue;
    const path = (input as Record<string, unknown>)['path'];
    if (typeof path !== 'string' || !path.startsWith('matters/')) continue;
    return path;
  }
  return null;
}

/** What the header calls the matter before (or without) reading its file:
 * the filename prettified, as the reader's own dochead would. */
function matterFallbackTitle(path: string): string {
  return prettifyName(path.slice(path.lastIndexOf('/') + 1));
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
export function Chat({
  threadId: initialThreadId,
  health,
  onThreadCreated,
  onThreadTouched,
  onFileDecided,
  onOpenFile,
  seed,
  onSeedUsed,
  initialAsk,
  onAskUsed,
  vaultPaths,
  onPolicy,
}: ChatProps): JSX.Element {
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
  /** The send that never reached the server, kept so Retry can run the whole
   * thing again — the create included. Only a draft whose `POST /threads`
   * failed can be in this state; every other error has a thread to reload. */
  const retry = useRef<{ message: string; provider: string } | null>(null);

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
    // Cleared before the draft guard: a load that finds nothing to fetch
    // must still dismiss whatever is on screen, or the button that called it
    // does nothing at all. A policy refusal is the exception: the send's own
    // `finally` reloads, and the sentence must survive that reload.
    if (!refusedRef.current) setError(null);
    const id = idRef.current;
    if (id === null) {
      setLoading(false);
      return;
    }
    const ticket = ++seq.current;
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

  /**
   * The docket's Review lands here with `&proposal=<id>` in the fragment:
   * scroll the slip into view once the transcript holding it has rendered.
   *
   * The target is STATE, refreshed on `hashchange`, not read imperatively
   * inside the scroll effect. The docket can list two pending proposals from
   * one thread; reviewing the second while already in that thread changes
   * the fragment and nothing else, so an effect keyed on the thread alone
   * would never run again and the second Review would do nothing.
   */
  const [anchor, setAnchor] = useState<string | null>(() => proposalFromHash(globalThis.location.hash));
  useEffect(() => {
    const onHash = (): void => setAnchor(proposalFromHash(globalThis.location.hash));
    globalThis.addEventListener('hashchange', onHash);
    return () => globalThis.removeEventListener('hashchange', onHash);
  }, []);

  // The scroll itself lives in ProposalCard: the card whose id the anchor
  // names scrolls into view in a layout effect when it mounts and whenever
  // the anchor changes to it. That is what makes a deep link land whatever
  // order the transcript and the hash arrive in — an effect here keyed on
  // `thread` ran before the slips were committed on a slow runner and
  // never ran again (CI, 2026-09-01).

  useEffect(() => () => abort.current?.abort(), []);

  useEffect(() => {
    const el = transcript.current;
    if (el !== null) el.scrollTop = el.scrollHeight;
  }, [thread, live, pending, frozen]);

  const send = async (message: string, provider: string): Promise<void> => {
    // One send at a time. The composer is locked for the whole of it, so this
    // only catches a caller that got past the UI.
    if (abort.current !== null) return;

    // The controller and the live turn are armed BEFORE the create is
    // awaited, and the create runs on the same controller. `live` is what
    // disables the box and arms Stop, so setting it after a `POST /threads`
    // that can take a network round trip would leave the composer wide open:
    // a second ⌘⏎ in that window would take the create branch again and open
    // a second thread, with the first orphaned and never stepped.
    const controller = new AbortController();
    abort.current = controller;
    started.current = new Map();
    retry.current = null;
    setLiveMs({});
    setError(null);
    setRefused(false);
    refusedRef.current = false;
    showPending(message);
    showLive(emptyAssistantTurn());

    if (idRef.current === null) {
      try {
        const header = await createThread({ title: titleFor(message) }, controller.signal);
        idRef.current = header.id;
        setThreadId(header.id);
        onThreadCreated?.(header);
      } catch (err) {
        // No step ran and there may be no thread, so there is nothing for
        // `load` to fetch: this is the one path that retires its own turn.
        // `settle` no-ops while a controller is live, so clear it first.
        abort.current = null;
        // The empty assistant turn never became an answer; freezing it would
        // park a blank bubble in the transcript for good.
        showLive(null);
        if (controller.signal.aborted) {
          // Stop during creation. Nothing was created and nothing was sent,
          // so nothing is left behind either.
          showPending(null);
          return;
        }
        if (!(err instanceof ApiError && err.status === 401)) setError(`could not start the thread: ${detail(err)}`);
        // The message stays on screen (frozen) and the box is free; `retry`
        // remembers it so the notice's button can run the send again.
        retry.current = { message, provider };
        settle(true);
        return;
      }
    }
    const id = idRef.current;

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
        // The runtime refused the step for the matter's privacy policy
        // (409 matter-stays-local): nothing ran, nothing to retry into —
        // the sentence is the whole answer, without a Retry into cloud.
        const body = err instanceof ApiError && err.status === 409 ? (err.body as { error?: string; message?: string } | null) : null;
        if (body !== null && body?.error === 'matter-stays-local') {
          showLive(null);
          showPending(null);
          setError(body.message ?? 'This matter stays on this machine.');
          setRefused(true);
          refusedRef.current = true;
          return;
        }
        showLive(applyStepEvent(liveRef.current ?? emptyAssistantTurn(), { type: 'error', message: detail(err) }));
        setError(detail(err));
      }
    } finally {
      abort.current = null;
      await load();
      onThreadTouched?.();
    }
  };

  /**
   * Home's ask box, sent (spec §3.2). The nonce is recorded BEFORE the send,
   * so a re-render cannot send the same ask twice, and `onAskUsed` drops it
   * from the shell, so a later remount of this pane cannot either.
   *
   * `initialAsk` is the only dependency on purpose: the nonce guard is what
   * decides whether the body runs, whatever identity `send` or `health` has
   * on a later render.
   */
  const askedNonce = useRef(0);
  useEffect(() => {
    if (initialAsk === undefined || initialAsk.nonce === askedNonce.current) return;
    askedNonce.current = initialAsk.nonce;
    onAskUsed?.();
    void send(initialAsk.text, defaultProviderId(health));
  }, [initialAsk]);

  const stop = (): void => abort.current?.abort();
  const reload = (): void => void load();

  /** A card settled a proposal. The thread is refetched so its proposals
   * read as the server has them, the rail hears that this thread moved,
   * and the shell gets the path — a drawer open on it is showing the file
   * as it was BEFORE the approval wrote it. */
  const decided = (path: string): void => {
    reload();
    onThreadTouched?.();
    onFileDecided?.(path);
  };

  /** The error notice's button. On a thread it refetches; on a draft whose
   * create failed there is nothing to refetch, so it runs the whole send
   * again — which is also the only way back to the message, since the
   * composer cleared it on the first attempt. */
  const retryNow = (): void => {
    const again = retry.current;
    if (again === null) {
      reload();
      return;
    }
    retry.current = null;
    // The failed attempt froze this message as a user bubble; the resend
    // shows it again as `pending`, so drop that one rather than stack two.
    setFrozen(current => current.slice(0, -1));
    void send(again.message, again.provider);
  };

  const runById = new Map(runs.map(run => [run.runId, run]));
  const turns: Turn[] = thread === null ? [] : buildTurns(thread.events);
  const streaming = live !== null;
  const isDraft = threadId === null && pending === null && frozen.length === 0;
  const empty = !loading && threadId !== null && turns.length === 0 && frozen.length === 0 && pending === null;

  /**
   * The header's matter: the EXPLICIT link on the thread header when there
   * is one, else the first matter file the thread read (inferred). An
   * explicit link is the lawyer's word and inference never overwrites it;
   * the inferred one is shown as such so it can be confirmed or changed.
   */
  const explicitMatter = thread?.header.matter ?? null;
  const inferredMatter = thread === null ? null : matterPathOf(thread.events);
  const matterPath = explicitMatter ?? inferredMatter;
  const matterInferred = explicitMatter === null && inferredMatter !== null;

  /**
   * Housekeeping on the header — a rename, a matter link — through
   * `PATCH /threads/:id`, then a refetch so the header reads as the server
   * has it and the rail hears that this thread's row changed. Neither bumps
   * `updatedAt`, so the row keeps its place.
   */
  const patchThread = async (patch: { title?: string; matter?: string | null }): Promise<void> => {
    const id = idRef.current;
    if (id === null) return;
    setError(null);
    try {
      await fetchJson<ThreadHeader>(`/threads/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(patch) });
      await load();
      onThreadTouched?.();
    } catch (err) {
      if (!(err instanceof ApiError && err.status === 401)) setError(detail(err));
    }
  };

  /** Inline rename: the title becomes a text input; Enter or blur saves a
   * changed name, Escape puts the old one back. `editingRef` makes the
   * commit idempotent — Enter commits and the input's unmount may still
   * blur once more. */
  const [editing, setEditing] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const editingRef = useRef(false);
  const startRename = (): void => {
    if (thread === null) return;
    setTitleDraft(thread.header.title?.trim() ?? '');
    editingRef.current = true;
    setEditing(true);
  };
  const commitRename = (): void => {
    if (!editingRef.current || thread === null) return;
    editingRef.current = false;
    setEditing(false);
    const next = titleDraft.trim();
    if (next === (thread.header.title?.trim() ?? '')) return;
    void patchThread({ title: next });
  };
  const cancelRename = (): void => {
    editingRef.current = false;
    setEditing(false);
  };

  /** Retry for a step that FAILED (cou-95): send the last user message
   * again, on the default provider, the way the composer would. Only the
   * transcript's final assistant turn offers it — an older failure has
   * been answered since. */
  const lastUser = [...turns].reverse().find((turn): turn is Extract<Turn, { kind: 'user' }> => turn.kind === 'user');
  const retryLast = lastUser === undefined ? undefined : (): void => void send(lastUser.content, defaultProviderId(health));

  /**
   * The matter's REAL title for the header (cou-93 item 7): a slug
   * prettified (`Sinai lerner k12 partnership`) is not what the lawyer calls
   * the matter. One read of the matter file, through the same frontmatter
   * model the reader uses; until it lands — or if it cannot — the prettified
   * filename stands in, so the line never flashes empty.
   */
  const [matterTitles, setMatterTitles] = useState<Record<string, { title: string; staysLocal: boolean }>>({});
  useEffect(() => {
    if (matterPath === null || matterTitles[matterPath] !== undefined) return;
    let cancelled = false;
    void (async () => {
      let title = matterFallbackTitle(matterPath);
      let staysLocal = false;
      try {
        const file = await fetchJson<VaultFile>(`/vault/read?path=${encodeURIComponent(matterPath)}`);
        if (typeof file.content === 'string') {
          const model = readerModel(file.content, matterPath);
          title = model.title;
          // The matter's own word (providers spec §7), so an INFERRED matter
          // that stays local can offer the link — never take it.
          staysLocal = model.rows.some(r => r.key === 'stays local' && /^(yes|true)$/i.test(r.value));
        }
      } catch {
        // A matter file that moved or cannot be read keeps the fallback —
        // the header is a courtesy, not a record.
      }
      if (!cancelled) setMatterTitles(current => ({ ...current, [matterPath]: { title, staysLocal } }));
    })();
    return () => {
      cancelled = true;
    };
  }, [matterPath]);
  const matterTitle = matterPath === null ? null : (matterTitles[matterPath]?.title ?? matterFallbackTitle(matterPath));
  const inferredStaysLocal = matterInferred && inferredMatter !== null && matterTitles[inferredMatter]?.staysLocal === true;
  /** The thread's policy as the runtime reports it; a draft has none. */
  const policy: ThreadPolicy | null = thread?.policy ?? null;
  const [refused, setRefused] = useState(false);
  /** Mirrors `refused` for `load`, which runs in the send's `finally` and
   * would otherwise wipe the refusal sentence the moment it appeared. */
  const refusedRef = useRef(false);
  useEffect(() => {
    onPolicy?.(policy);
  }, [policy?.localOnly, policy?.source]);

  return (
    <section className="v2-chat">
      {thread === null ? null : (
        <header className="v2-thread-head">
          <h1>
            {editing ? (
              <input
                className="v2-thread-title-edit"
                aria-label="Conversation title"
                value={titleDraft}
                autoFocus
                onFocus={event => event.currentTarget.select()}
                onChange={event => setTitleDraft(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    commitRename();
                  } else if (event.key === 'Escape') {
                    event.preventDefault();
                    cancelRename();
                  }
                }}
                onBlur={commitRename}
              />
            ) : (
              <button type="button" className="v2-thread-rename" title="Rename this conversation" onClick={startRename}>
                {titleOf(thread.header)}
              </button>
            )}
          </h1>
          {/* Set text with a small-caps run-in, linked to the file — not a
              pill (the ledger language has none). An inferred matter says
              so; the picker beside it makes the link explicit. */}
          {matterPath === null || matterTitle === null ? null : (
            <a className="v2-thread-matter" href={`#/vault?path=${encodeURIComponent(matterPath)}`} title={matterPath}>
              <span className="v2-tag">Matter</span>
              <span className="v2-thread-matter-name">{matterTitle}</span>
            </a>
          )}
          {/* The policy in force reads beside the matter (providers spec §7):
              set text, and only from an EXPLICIT link. An inferred matter
              that stays local offers the link instead — never takes it. */}
          {policy !== null && policy.localOnly && policy.source === 'matter' && explicitMatter !== null ? (
            <span className="v2-thread-local">· stays local</span>
          ) : null}
          {matterInferred ? <span className="v2-thread-inferred">inferred</span> : null}
          {inferredStaysLocal && inferredMatter !== null ? (
            <button type="button" className="v2-link v2-thread-linkit" onClick={() => void patchThread({ matter: inferredMatter })}>
              stays local — link it
            </button>
          ) : null}
          <MatterPicker current={explicitMatter} label={matterPath === null ? 'link a matter' : 'change'} onPick={path => void patchThread({ matter: path })} />
          <span className="v2-thread-date">{relTime(thread.header.createdAt)}</span>
        </header>
      )}

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
            onDecided={decided}
            onOpenFile={onOpenFile}
            vaultPaths={vaultPaths}
            {...(i === turns.length - 1 && turn.kind === 'assistant' && turn.error !== undefined && !streaming ? { onRetry: retryLast } : {})}
            anchor={anchor}
          />
        ))}
        {frozen.map((turn, i) => (
          <TurnView key={`frozen-${i}`} turn={turn} threadId={threadId} onReload={reload} onDecided={decided} onOpenFile={onOpenFile} vaultPaths={vaultPaths} anchor={anchor} />
        ))}
        {pending === null ? null : <TurnView turn={{ kind: 'user', content: pending }} threadId={threadId} onReload={reload} />}
        {live === null ? null : (
          <TurnView turn={live} threadId={threadId} live liveMs={liveMs} onReload={reload} onDecided={decided} onOpenFile={onOpenFile} vaultPaths={vaultPaths} anchor={anchor} />
        )}
      </div>

      {error === null ? null : (
        <div className="v2-notice v2-notice-error v2-chat-error" role="alert">
          <span>{error}</span>
          {refused ? null : (
            <button type="button" onClick={retryNow}>
              Retry
            </button>
          )}
        </div>
      )}

      <Composer
        streaming={streaming}
        health={health}
        policy={policy}
        matter={explicitMatter === null || matterTitle === null ? null : { path: explicitMatter, title: matterTitle }}
        {...(explicitMatter === null ? {} : { dropDest: matterFolderOf(explicitMatter) })}
        seed={seed}
        onSeedUsed={onSeedUsed}
        onSend={message => void send(message, defaultProviderId(health))}
        onStop={stop}
      />
    </section>
  );
}
