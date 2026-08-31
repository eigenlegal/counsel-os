import { useEffect, useMemo, useState } from 'react';
import { ApiError, fetchJson } from '../../api/client';
import type { ApproveResult, ConflictBody, ProposalStatus, VaultFile } from '../../api/types';
import type { ProposalView } from '../../chat/turns';
import { unifiedHunks, type Hunk } from '../diff';
import { Chevron } from '../icons';
import { redlineBlocks, wordDiff, type RedlineBlock } from '../redline';

export interface ProposalCardProps {
  threadId: string;
  proposal: ProposalView;
  /** Refetches the thread. Offered after a conflict. */
  onReload: () => void;
  /** A decision landed on this path. The shell uses it to refetch a drawer
   * already open on the file the approval just wrote, and to move the
   * thread's place in the rail. */
  onDecided?: (path: string) => void;
  /** Opens the path in the vault drawer. Without it, "open in vault" is a
   * link to the full page. */
  onOpenFile?: (path: string) => void;
}

interface Conflict {
  expected: string;
  actual: string;
}

/** The vault file as it stands, fetched for the redline's left-hand side. */
type Current =
  | { state: 'loading' }
  | { state: 'ready'; content: string; version: string | null }
  | { state: 'failed'; message: string };

type RedlineView = 'changes' | 'whole' | 'lines';

/** Set-text status (spec §2): italic serif, never a pill. An approval made
 * on THIS card carries the decision time the mock shows (`✓ approved ·
 * 2:41 pm`); one read back from the log has no decision time to show. */
export function statusText(status: ProposalStatus, decidedAt?: string): { className: string; label: string } {
  if (status === 'pending') return { className: 'v2-status v2-status-pending', label: 'pending' };
  if (status === 'approved') {
    return {
      className: 'v2-status v2-status-approved',
      label: decidedAt === undefined ? '✓ approved' : `✓ approved · ${decidedAt}`,
    };
  }
  return { className: 'v2-status v2-status-rejected', label: 'rejected' };
}

/**
 * A proposed write as a DOCUMENT SLIP (spec §3.3): bounded by a double rule
 * top / hairline bottom, the content on the page — no card box, no accent
 * border (founder amendment 1). The change reads as Word-style tracked
 * changes: `diffWords` rendered inline as React text nodes (`<del>` strike /
 * `<ins>` underline) in the document's own serif — changed blocks only, with
 * `whole document` and `line diff` (the step-5 `unifiedHunks`) one click
 * away. NEVER through innerHTML: the sanitizer stays the app's only HTML
 * sink, and no part of a redline goes near it.
 *
 * Approved/rejected slips collapse to their set-text status with the change
 * one `view change` fold away. The current file is fetched ONCE, on mount —
 * not again after a decision — so a settled slip keeps showing what
 * changed. The 409 handling is unchanged from the step-5 card.
 */
export function ProposalCard({ threadId, proposal, onReload, onDecided, onOpenFile }: ProposalCardProps): JSX.Element {
  const [status, setStatus] = useState<ProposalStatus>(proposal.status);
  const [decidedAt, setDecidedAt] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [conflict, setConflict] = useState<Conflict | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<RedlineView>('changes');
  const [showChange, setShowChange] = useState(false);
  const [current, setCurrent] = useState<Current>({ state: 'loading' });

  // A reload brings a fresh proposal in on the same key; the server's copy wins.
  const [syncedFrom, setSyncedFrom] = useState<ProposalStatus>(proposal.status);
  if (proposal.status !== syncedFrom) {
    setSyncedFrom(proposal.status);
    setStatus(proposal.status);
    setConflict(null);
    setError(null);
  }

  useEffect(() => {
    let live = true;
    setCurrent({ state: 'loading' });
    void (async () => {
      try {
        const file = await fetchJson<VaultFile>(`/vault/read?path=${encodeURIComponent(proposal.path)}`);
        if (live) setCurrent({ state: 'ready', content: file.content, version: file.version });
      } catch (err) {
        if (!live) return;
        // A file that does not exist yet is an honest "before": empty, so
        // every proposed word reads as an insertion.
        if (err instanceof ApiError && err.status === 404) setCurrent({ state: 'ready', content: '', version: null });
        else if (!(err instanceof ApiError && err.status === 401)) {
          setCurrent({ state: 'failed', message: err instanceof Error ? err.message : String(err) });
        }
      }
    })();
    return () => {
      live = false;
    };
  }, [proposal.path]);

  const decide = async (decision: 'approve' | 'reject'): Promise<void> => {
    setBusy(true);
    setConflict(null);
    setError(null);
    try {
      const result = await fetchJson<ApproveResult>(`/threads/${encodeURIComponent(threadId)}/approve`, {
        method: 'POST',
        body: JSON.stringify({ proposalId: proposal.id, decision }),
      });
      setStatus(result.proposal?.status ?? (decision === 'approve' ? 'approved' : 'rejected'));
      setDecidedAt(new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).toLowerCase());
      // The server now holds the settled proposal — and, on an approval, a
      // vault file that is not what any open reader is showing. The card
      // keeps its own redline (the "before" was fetched once, on mount), so
      // nothing here undoes it.
      onDecided?.(proposal.path);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        const body = err.body as ConflictBody | null;
        if (body?.conflict) {
          setConflict(body.conflict);
        } else {
          if (body?.proposal) setStatus(body.proposal.status);
          setError(body?.error ?? 'this proposal is no longer pending');
        }
      } else {
        setError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      setBusy(false);
    }
  };

  // Both representations are memoized on the two texts — flipping views
  // recomputes nothing, and a re-render for `busy` recomputes nothing.
  const blocks: RedlineBlock[] | null = useMemo(
    () =>
      current.state === 'ready' && proposal.content !== undefined
        ? redlineBlocks(wordDiff(current.content, proposal.content))
        : null,
    [current, proposal.content],
  );
  const hunks: Hunk[] | null = useMemo(
    () =>
      current.state === 'ready' && proposal.content !== undefined ? unifiedHunks(current.content, proposal.content) : null,
    [current, proposal.content],
  );

  /**
   * The change `diffWords` cannot see (review H1). `diffWords` ignores
   * whitespace, so an edit that moves nothing but whitespace — a dropped
   * trailing newline, CRLF normalised to LF, a reflowed paragraph — yields
   * zero marks and zero changed blocks. Saying "the file already says this"
   * there would tell the reviewer nothing will be written, and then write a
   * different file. So the slip says what the change is and opens on the
   * line diff, which does show it.
   */
  const whitespaceOnly =
    current.state === 'ready' &&
    proposal.content !== undefined &&
    current.content !== proposal.content &&
    blocks !== null &&
    blocks.every(block => !block.changed);

  // Derived-from-state during render, once per proposal: the default view is
  // `changes only`, and only a whitespace-only change moves it.
  const [openedOnLines, setOpenedOnLines] = useState(false);
  if (whitespaceOnly && !openedOnLines) {
    setOpenedOnLines(true);
    setView('lines');
  }

  const settled = status !== 'pending';
  const text = statusText(status, decidedAt);
  const bodyShown = !settled || showChange;

  /**
   * What an empty redline actually means. After a page reload an APPROVED
   * proposal reads the current file — which is now the approved content — so
   * `wordDiff` finds nothing. "The file already says this" is true and
   * useless there; what happened is that this change is the reason it says
   * it (review L1). `null` when the whitespace notice above already spoke.
   */
  const emptyMeans = whitespaceOnly
    ? null
    : status === 'approved' && current.state === 'ready' && current.content === proposal.content
      ? 'This change is already applied — the file now reads as proposed.'
      : 'No changes — the file already says this.';

  return (
    <section className="v2-proposal" id={`proposal-${proposal.id}`} data-testid={`proposal-${proposal.id}`}>
      <header className="v2-slip-head">
        <span className="v2-tag">proposal</span>
        <code className="v2-proposal-path">{proposal.path}</code>
        {onOpenFile === undefined ? (
          <a className="v2-link" href={`#/vault?path=${encodeURIComponent(proposal.path)}`}>
            open in vault
          </a>
        ) : (
          <button type="button" className="v2-link" onClick={() => onOpenFile(proposal.path)}>
            open in vault
          </button>
        )}
        <span className={text.className}>{text.label}</span>
      </header>

      <p className="v2-slip-why">{proposal.rationale}</p>

      {settled ? (
        <div className="v2-slip-acts">
          <button type="button" className="v2-link" aria-expanded={showChange} onClick={() => setShowChange(s => !s)}>
            view change <Chevron />
          </button>
        </div>
      ) : null}

      {!bodyShown ? null : proposal.content === undefined ? (
        // The stream's `proposal` event carries no content; the reload after
        // the step brings it.
        <p className="muted v2-proposal-loading" role="status">
          loading the change…
        </p>
      ) : current.state === 'loading' ? (
        <p className="muted" role="status">
          loading current file…
        </p>
      ) : (
        <>
          {current.state === 'failed' ? (
            <p className="v2-notice v2-notice-warn" role="status">
              could not load current file: {current.message}
            </p>
          ) : null}

          {!whitespaceOnly ? null : (
            <p className="v2-notice v2-notice-warn v2-redline-whitespace" role="status">
              Only whitespace or line-ending changes — see the line diff.
            </p>
          )}

          {blocks === null || hunks === null ? (
            <pre className="v2-proposal-raw">{proposal.content}</pre>
          ) : view === 'lines' ? (
            <LineDiff hunks={hunks} />
          ) : (
            <Redline blocks={blocks} changedOnly={view === 'changes'} empty={emptyMeans} />
          )}

          {blocks === null ? null : (
            <div className="v2-redline-toggle">
              showing{' '}
              <button type="button" className="v2-link" aria-pressed={view === 'changes'} onClick={() => setView('changes')}>
                changes only
              </button>
              {' · '}
              <button type="button" className="v2-link" aria-pressed={view === 'whole'} onClick={() => setView('whole')}>
                whole document
              </button>
              {' · '}
              <button type="button" className="v2-link" aria-pressed={view === 'lines'} onClick={() => setView('lines')}>
                line diff
              </button>
            </div>
          )}
        </>
      )}

      {status === 'pending' && conflict === null ? (
        <div className="v2-slip-acts">
          <button type="button" className="v2-primary" disabled={busy} onClick={() => void decide('approve')}>
            Approve
          </button>
          <button type="button" disabled={busy} onClick={() => void decide('reject')}>
            Reject
          </button>
          {current.state === 'ready' && current.version !== null ? (
            <span className="v2-slip-base">against version {current.version.slice(0, 7)}</span>
          ) : null}
        </div>
      ) : null}

      {conflict === null ? null : (
        <footer className="v2-notice v2-notice-error v2-proposal-conflict" role="alert">
          <p>The file changed since this was proposed, so nothing was written — reload the thread and ask again.</p>
          <dl className="v2-conflict">
            <dt>Expected</dt>
            <dd>
              <code>{conflict.expected}</code>
            </dd>
            <dt>Actual</dt>
            <dd>
              <code>{conflict.actual}</code>
            </dd>
          </dl>
          <button
            type="button"
            onClick={() => {
              setConflict(null);
              setError(null);
              onReload();
            }}
          >
            Reload
          </button>
        </footer>
      )}

      {error === null ? null : (
        <p className="v2-notice v2-notice-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}

/**
 * The tracked-changes body: React text nodes inside del/ins — no HTML sink.
 *
 * `empty` is what nothing-to-mark MEANS here — the caller knows, this does
 * not. `null` is the whitespace-only case, where the slip's own notice above
 * has already said it and a second line would only repeat.
 */
function Redline({
  blocks,
  changedOnly,
  empty,
}: {
  blocks: RedlineBlock[];
  changedOnly: boolean;
  empty: string | null;
}): JSX.Element {
  const shown = changedOnly ? blocks.filter(b => b.changed) : blocks;
  const hidden = blocks.length - shown.length;
  return (
    <div className="v2-redline">
      {shown.length === 0 ? (
        empty === null ? null : <p className="muted">{empty}</p>
      ) : (
        shown.map((block, i) => (
          <p className="v2-redline-block" key={i}>
            {block.spans.map((span, j) =>
              span.kind === 'ins' ? (
                <ins key={j}>{span.text}</ins>
              ) : span.kind === 'del' ? (
                <del key={j}>{span.text}</del>
              ) : (
                <span key={j}>{span.text}</span>
              ),
            )}
          </p>
        ))
      )}
      {changedOnly && hidden > 0 ? (
        <p className="v2-redline-elided muted">
          ⋯ {hidden} unchanged {hidden === 1 ? 'block' : 'blocks'} hidden
        </p>
      ) : null}
    </div>
  );
}

/** The step-5 line diff, unchanged, as the third view. */
function LineDiff({ hunks }: { hunks: Hunk[] }): JSX.Element {
  return (
    <div className="v2-diff">
      {hunks.length === 0 ? (
        <p className="muted">No changes — the file already says this.</p>
      ) : (
        hunks.map((hunk, h) => (
          <pre className="v2-hunk" key={h}>
            {hunk.map((line, i) => (
              <span key={i} className={`v2-diff-line v2-diff-${line.kind}`}>
                {(line.kind === 'add' ? '+' : line.kind === 'del' ? '-' : ' ') + line.text + '\n'}
              </span>
            ))}
          </pre>
        ))
      )}
    </div>
  );
}
