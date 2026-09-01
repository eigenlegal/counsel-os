import { useMemo } from 'react';
import type { RunRecord } from '../../api/types';
import type { ToolCallView, Turn } from '../../chat/turns';
import { renderMarkdown } from '../../vault/markdown';
import { humanizeStepError } from '../errors';
import { ArtifactSlip } from './ArtifactSlip';
import { citationMap, markCitations, readPathsOf } from './cite';
import { ProposalCard } from './ProposalCard';
import { Strip } from './Strip';
import { WorkLine } from './WorkLine';

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
  /** Passed to every proposal card: a decision landed on this path. */
  onDecided?: (path: string) => void;
  onOpenFile?: (path: string) => void;
  /** Every file path the vault holds. A backticked FULL path the answer
   * names becomes a click target when it is one of these (cou-93 item 8) —
   * the second gate beside the derivation set, never a third source. */
  vaultPaths?: ReadonlySet<string>;
  /** Offered on a turn whose step FAILED: sends the same message again. */
  onRetry?: () => void;
}

/**
 * The attachment line `withAttachments` puts at the end of a message —
 * backticked vault paths, space-separated — read as chips, the way the
 * composer showed them. User text is never markdown-rendered; only that one
 * trailing line is recognised, by shape.
 */
export function splitAttachments(content: string): { text: string; files: string[] } {
  const trimmed = content.replace(/\s+$/, '');
  const lines = trimmed.split('\n');
  const last = lines[lines.length - 1] ?? '';
  if (!/^`[^`\n]+`(\s+`[^`\n]+`)*$/.test(last.trim())) return { text: content, files: [] };
  const files = Array.from(last.matchAll(/`([^`]+)`/g), m => m[1]!);
  return { text: lines.slice(0, -1).join('\n').replace(/\s+$/, ''), files };
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
 * The assistant's answer, as markdown, with SOURCE CHIPS (spec §3.3).
 *
 * Models write markdown whether or not they are asked to, and this column is
 * serif prose — the one place the reader looks first — so `**Action:**` and
 * backticked paths must not reach it as literal characters. `renderMarkdown`
 * is the sanitizer's single entry point (`vault/markdown.ts` →
 * `vault/sanitize.ts`), which is why it is also the only thing this file
 * feeds to `dangerouslySetInnerHTML`.
 *
 * The source chips are DERIVED and only derived: `citationMap` is built from
 * the `vault_read` calls this step actually made, and a code span becomes a
 * chip only when its text is one of those spellings. A model that writes a
 * `#/vault?path=` link of its own gets an href-less anchor (the sanitizer
 * drops same-page fragments) with no chip class and no delegation — it can
 * neither look like a citation nor open the drawer.
 *
 * The streaming branch renders the SAME way. `marked` parses a partial
 * document without complaining — an unclosed `**` is simply not emphasis
 * yet — and re-parsing per chunk is memoized on the text, so the answer does
 * not change typeface at the moment the stream ends.
 *
 * A second, wider gate (cou-93 item 8): a code span whose text is a FULL
 * path the vault holds (`vaultPaths`, from `GET /vault/index`) is a chip too
 * — "see `matters/acme.md`" in an answer that listed the directory rather
 * than reading the file was dead text. Full paths only: a bare basename
 * still resolves through the derivation map alone, so an ambiguous `nda.md`
 * can never open the wrong file. Same minting, same click gate — the model
 * still cannot name a path into existence.
 */
function Prose({
  text,
  tools,
  vaultPaths,
  onOpenFile,
}: {
  text: string;
  tools: ToolCallView[];
  vaultPaths?: ReadonlySet<string>;
  onOpenFile?: (path: string) => void;
}): JSX.Element {
  // The memos key on the paths as a STRING, not on the array: `buildTurns`
  // rebuilds every turn on every render of the pane, so an array dep would
  // re-parse the whole transcript's markdown on each frame of a stream.
  const cites = readPathsOf(tools).join('\n');
  const derived = useMemo(() => citationMap(cites === '' ? [] : cites.split('\n')), [cites]);
  const spellings = useMemo(() => new Set([...derived.keys(), ...(vaultPaths ?? [])]), [derived, vaultPaths]);
  const html = useMemo(() => markCitations(renderMarkdown(text), spellings), [text, spellings]);
  return (
    <div
      className="markdown v2-prose"
      onClick={event => {
        if (onOpenFile === undefined) return;
        const chip = (event.target as Element).closest?.('code.v2-cite');
        if (chip === null || chip === undefined) return;
        // The derivation map, then the vault index, are the second gate: a
        // chip whose text is neither a file this step read nor a path the
        // vault holds opens nothing.
        const spelled = chip.textContent ?? '';
        const path = derived.get(spelled) ?? (vaultPaths?.has(spelled) === true ? spelled : undefined);
        if (path === undefined) return;
        event.preventDefault();
        onOpenFile(path);
      }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

/**
 * A failed step, said plainly (cou-95): the humanized line, Retry when the
 * chat offers one, and the provider's original words (and any partial
 * answer) folded under "show details" — never lost, never leading.
 */
function StepFailure({
  error,
  providerId,
  onRetry,
}: {
  error: { message: string; text?: string };
  providerId: string;
  onRetry?: () => void;
}): JSX.Element {
  const human = humanizeStepError(error.message, providerId);
  const hasDetail = human.detail !== undefined || error.text !== undefined;
  return (
    <div className="v2-notice v2-notice-error v2-step-failure" role="alert">
      <p>
        {human.line}
        {onRetry === undefined ? null : (
          <button type="button" className="v2-retry" onClick={onRetry}>
            Retry
          </button>
        )}
      </p>
      {hasDetail ? (
        <details>
          <summary>{error.text === undefined ? 'show details' : 'show answer'}</summary>
          {human.detail === undefined ? null : <p className="v2-error-raw">{human.detail}</p>}
          {error.text === undefined ? null : <pre>{error.text}</pre>}
        </details>
      ) : null}
    </div>
  );
}

/**
 * One turn (spec §3.3): a user bubble, or the quiet work line, the
 * assistant's answer, its proposal slips, the documents it produced, then the strip. The work line runs
 * above the text on both paths, so the reader sees the work as it happens
 * and can still find it after the answer lands.
 */
export function TurnView({ turn, threadId, run, live = false, liveMs = {}, onReload, onDecided, onOpenFile, vaultPaths, onRetry }: TurnProps): JSX.Element {
  if (turn.kind === 'user') {
    const { text, files } = splitAttachments(turn.content);
    return (
      <article className="v2-turn v2-turn-user">
        <div className="v2-user-text">
          {text === '' ? null : <p>{text}</p>}
          {files.length === 0 ? null : (
            <div className="v2-user-files">
              {files.map(file => (
                <code key={file} className="v2-file-chip">
                  {file}
                </code>
              ))}
            </div>
          )}
        </div>
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
          <WorkLine tools={turn.tools} ms={ms} onOpenFile={onOpenFile} />
          {turn.text === '' ? (
            <p className="v2-working" role="status">
              working…
            </p>
          ) : (
            <Prose text={turn.text} tools={turn.tools} vaultPaths={vaultPaths} onOpenFile={onOpenFile} />
          )}
        </>
      ) : (
        <>
          {/* The work line reads ABOVE the answer, finished or not: what was
              consulted, then what it concluded. */}
          <WorkLine tools={turn.tools} ms={ms} onOpenFile={onOpenFile} />
          {turn.text === '' ? null : <Prose text={turn.text} tools={turn.tools} vaultPaths={vaultPaths} onOpenFile={onOpenFile} />}

          {/* The turn owns its error text: it reads here, unfolded, and the
              strip's record leaves out the identical copy it holds. */}
          {turn.error === undefined ? null : <StepFailure error={turn.error} providerId={turn.provider ?? ''} onRetry={onRetry} />}

          {threadId === null
            ? null
            : turn.proposals.map(proposal => (
                <ProposalCard
                  key={proposal.id}
                  threadId={threadId}
                  proposal={proposal}
                  onReload={onReload}
                  onDecided={onDecided}
                  onOpenFile={onOpenFile}
                />
              ))}

          {/* Documents the step produced (spec §6): under the answer and its
              proposals, above the strip. */}
          {turn.artifacts.map(artifact => (
            <ArtifactSlip key={artifact.id} artifact={artifact} onOpenFile={onOpenFile} />
          ))}

          <Strip turn={turn} run={run} ms={ms} onOpenFile={onOpenFile} />
        </>
      )}
    </article>
  );
}
