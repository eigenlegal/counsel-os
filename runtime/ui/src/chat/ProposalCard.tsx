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
        // Two different 409s share the status: the file moved (a `conflict`
        // to show), or the proposal was already decided (no `conflict`, and
        // the message is the whole story).
        if (body?.conflict) setConflict(body.conflict);
        else setError(body?.error ?? 'this proposal is no longer pending');
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
          <button type="button" onClick={onReload}>
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
