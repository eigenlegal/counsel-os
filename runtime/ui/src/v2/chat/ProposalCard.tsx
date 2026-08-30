import { useEffect, useMemo, useState } from 'react';
import { ApiError, fetchJson } from '../../api/client';
import type { ApproveResult, ConflictBody, ProposalStatus, VaultFile } from '../../api/types';
import type { ProposalView } from '../../chat/turns';
import { isMarkdown, renderMarkdown } from '../../vault/markdown';
import { unifiedHunks, type Hunk } from '../diff';

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

/** The vault file as it stands, fetched for the diff's left-hand side. */
type Current =
  | { state: 'loading' }
  | { state: 'ready'; content: string; version: string | null }
  | { state: 'failed'; message: string };

/**
 * A proposed write as a redline (spec §2, "Proposal card"): the current
 * file against the proposed content, approve / reject in place, a preview
 * of the proposed markdown one flip away. Still the only place the UI
 * writes the vault, and the 409 handling is the step-4 card's: the file
 * moved, nothing was written, show both versions and offer a reload.
 *
 * The current file is fetched ONCE, on mount — not again after a decision —
 * so an approved card keeps showing what changed rather than an empty diff
 * of the file against itself.
 */
export function ProposalCard({ threadId, proposal, onReload, onDecided, onOpenFile }: ProposalCardProps): JSX.Element {
  const [status, setStatus] = useState<ProposalStatus>(proposal.status);
  const [busy, setBusy] = useState(false);
  const [conflict, setConflict] = useState<Conflict | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'diff' | 'preview'>('diff');
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
        // every proposed line reads as an addition.
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
      // The server now holds the settled proposal — and, on an approval, a
      // vault file that is not what any open reader is showing. The card
      // keeps its own diff (the "before" was fetched once, on mount), so
      // nothing here undoes the redline.
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

  // Keyed on the two texts and NOT on `view`. A full rewrite of a long file
  // costs hundreds of milliseconds, so it is paid once: flipping to preview
  // and back reuses this, and a re-render for `busy` or for the streaming
  // parent above recomputes nothing. Adding `view` to the deps would skip
  // the compute while previewing at the price of redoing it on the way back,
  // which is the more common move of the two.
  const hunks: Hunk[] | null = useMemo(
    () => (current.state === 'ready' && proposal.content !== undefined ? unifiedHunks(current.content, proposal.content) : null),
    [current, proposal.content],
  );

  return (
    <section className="v2-card v2-proposal" data-testid={`proposal-${proposal.id}`}>
      <header className="v2-proposal-head">
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
        <span className={`v2-pill v2-pill-${status}`}>{status}</span>
      </header>

      <p className="v2-proposal-rationale">{proposal.rationale}</p>

      {proposal.content === undefined ? (
        // The stream's `proposal` event carries no content; the reload after
        // the step brings it (spec §2, "Live proposal").
        <p className="muted v2-proposal-loading" role="status">
          loading diff…
        </p>
      ) : current.state === 'loading' ? (
        <p className="muted" role="status">
          loading current file…
        </p>
      ) : (
        <>
          <div className="v2-proposal-tools">
            <button type="button" className="v2-link" aria-pressed={view === 'diff'} onClick={() => setView('diff')}>
              diff
            </button>
            <button type="button" className="v2-link" aria-pressed={view === 'preview'} onClick={() => setView('preview')}>
              preview
            </button>
            {current.state === 'ready' && current.version !== null ? (
              <span className="v2-proposal-version">against version {current.version.slice(0, 7)}</span>
            ) : null}
          </div>

          {current.state === 'failed' ? (
            <p className="v2-notice v2-notice-warn" role="status">
              could not load current file: {current.message}
            </p>
          ) : null}

          {view === 'preview' ? (
            <Preview path={proposal.path} content={proposal.content} />
          ) : hunks === null ? (
            <pre className="v2-proposal-raw">{proposal.content}</pre>
          ) : hunks.length === 0 ? (
            <p className="muted">No changes — the file already says this.</p>
          ) : (
            <Diff hunks={hunks} />
          )}
        </>
      )}

      {status === 'pending' && conflict === null ? (
        <div className="v2-proposal-actions">
          <button type="button" className="v2-primary" disabled={busy} onClick={() => void decide('approve')}>
            Approve
          </button>
          <button type="button" disabled={busy} onClick={() => void decide('reject')}>
            Reject
          </button>
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

function Diff({ hunks }: { hunks: Hunk[] }): JSX.Element {
  return (
    <div className="v2-diff">
      {hunks.map((hunk, h) => (
        <pre className="v2-hunk" key={h}>
          {hunk.map((line, i) => (
            <span key={i} className={`v2-diff-line v2-diff-${line.kind}`}>
              {(line.kind === 'add' ? '+' : line.kind === 'del' ? '-' : ' ') + line.text + '\n'}
            </span>
          ))}
        </pre>
      ))}
    </div>
  );
}

/** The proposed file as it would read. `renderMarkdown` is the sanitizer's
 * one entry point — the only HTML sink in the app. */
function Preview({ path, content }: { path: string; content: string }): JSX.Element {
  return isMarkdown(path) ? (
    <div className="markdown v2-preview" dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }} />
  ) : (
    <pre className="v2-preview">{content}</pre>
  );
}
