import { useState } from 'react';
import { ApiError, fetchJson } from '../api/client';
import type { ApproveResult, ConflictBody, ProposalStatus } from '../api/types';
import type { ProposalView } from './turns';

export interface ProposalCardProps {
  threadId: string;
  proposal: ProposalView;
  /** Refetches the thread. Offered after a conflict, where the card on
   * screen is describing a file that has since moved. */
  onReload: () => void;
}

interface Conflict {
  expected: string;
  actual: string;
}

/**
 * A proposed write, and the only place in the UI that writes the vault
 * (spec §2). The model never writes a knowledge path itself: it proposes,
 * and this card is where a lawyer approves or rejects.
 *
 * The 409 case is the one worth care. It means the file changed between the
 * proposal and the click, so the proposed content was written against a
 * version that is gone. The card refuses to guess: it shows both hashes and
 * offers a reload, because the right next move is to re-read the file and
 * ask again, never to overwrite whatever landed in between.
 */
export function ProposalCard({ threadId, proposal, onReload }: ProposalCardProps): JSX.Element {
  const [status, setStatus] = useState<ProposalStatus>(proposal.status);
  const [busy, setBusy] = useState(false);
  const [conflict, setConflict] = useState<Conflict | null>(null);
  const [error, setError] = useState<string | null>(null);

  // The card keeps its own status so a decision shows without waiting for a
  // refetch — but a reload brings a fresh proposal in on the same React key,
  // and the server's copy has to win. Tracking the prop this state was
  // synced from is React's own answer to that; without it, Reload would
  // redraw the stale local guess.
  const [syncedFrom, setSyncedFrom] = useState<ProposalStatus>(proposal.status);
  if (proposal.status !== syncedFrom) {
    setSyncedFrom(proposal.status);
    setStatus(proposal.status);
    setConflict(null);
    setError(null);
  }

  const decide = async (decision: 'approve' | 'reject'): Promise<void> => {
    setBusy(true);
    setConflict(null);
    setError(null);
    try {
      const result = await fetchJson<ApproveResult>(`/threads/${encodeURIComponent(threadId)}/approve`, {
        method: 'POST',
        body: JSON.stringify({ proposalId: proposal.id, decision }),
      });
      // The server answers with the proposal as it now stands; the local
      // guess is only for a response that somehow carries none.
      setStatus(result.proposal?.status ?? (decision === 'approve' ? 'approved' : 'rejected'));
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        const body = err.body as ConflictBody | null;
        // Two different 409s share the status. The file moved under the
        // proposal — show both versions and offer a reload. Or somebody
        // already decided it, in which case the server hands back the
        // settled proposal: adopt that status, so the card stops offering
        // buttons for a decision that has already been made.
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

  return (
    <section className="card proposal-card" data-testid={`proposal-${proposal.id}`}>
      <header className="proposal-head">
        <span className="proposal-label">proposed update</span>
        <code className="proposal-path">{proposal.path}</code>
        <span className={`badge badge-${status}`}>{status}</span>
      </header>

      <p className="proposal-rationale">{proposal.rationale}</p>

      {proposal.content === undefined ? null : (
        <details className="proposal-content">
          <summary>Proposed content</summary>
          <pre>{proposal.content}</pre>
        </details>
      )}

      {status === 'pending' && conflict === null ? (
        <div className="proposal-actions">
          <button type="button" disabled={busy} onClick={() => void decide('approve')}>
            Approve
          </button>
          <button type="button" disabled={busy} onClick={() => void decide('reject')}>
            Reject
          </button>
        </div>
      ) : null}

      {conflict === null ? null : (
        <div className="notice notice-error" role="alert">
          <p>
            The file changed since this was proposed, so nothing was written. Reload the thread and ask again.
          </p>
          <dl className="conflict">
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
              // Clear the conflict here, not just in the parent: the refetch
              // may bring back a proposal in the same state it is already in
              // (nothing was written), and the card must not keep showing a
              // stale conflict over it.
              setConflict(null);
              setError(null);
              onReload();
            }}
          >
            Reload
          </button>
        </div>
      )}

      {error === null ? null : (
        <p className="notice notice-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
