import { useEffect, useState } from 'react';
import { href, request, type MatterBrief, type Turn } from './api';
import type { BriefProposal as Suggestion } from '../../../src/workspace/brief-proposals';
import { Badge, ErrorNotice, fullDate, Modal, Prose } from './components';
import { Icon } from './icons';

function BriefComparison({
  turn,
  proposal,
  close,
  reviewed,
}: {
  turn: Turn;
  proposal: Suggestion;
  close: () => void;
  reviewed: (turn: Turn) => void;
}): JSX.Element {
  const [current, setCurrent] = useState<MatterBrief | null>(null),
    [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    if (proposal.review !== 'pending') {
      setLoading(false);
      return;
    }
    const abort = new AbortController();
    setLoading(true);
    setError('');
    request<MatterBrief | null>(`/matters/${proposal.matterId}/brief`, undefined, abort.signal)
      .then((value) => {
        if (!abort.signal.aborted) {
          setCurrent(value);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (!abort.signal.aborted) {
          setError((e as Error).message);
          setLoading(false);
        }
      });
    return () => abort.abort();
  }, [proposal.matterId, proposal.review, retry]);
  const stale = !loading && (current?.id ?? null) !== proposal.basedOnRevisionId;
  const pending = proposal.review === 'pending';
  const before = (pending ? current : null) ?? {
    summary: turn.state.matterContext?.summary ?? '',
    status: turn.state.matterContext?.status ?? 'open',
    questions: turn.state.matterContext?.questions ?? '',
    nextActions: turn.state.matterContext?.nextActions ?? '',
  };
  async function review(action: 'apply' | 'dismiss') {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      reviewed(
        await request<Turn>(`/turns/${turn.id}/brief-review`, { proposalId: proposal.id, action }),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title={pending ? "Review matter update" : "Matter update"} onClose={close} busy={busy}>
      <div className="record-form brief-comparison-form">
        <p className="form-intro">{proposal.reason}</p>
        <p className="fine-print">
          This changes the matter’s working brief, not its documents, saved advice or legal
          decisions. It does not create reminders or verify dates.
        </p>
        {loading ? (
          <p role="status">Checking the current matter brief…</p>
        ) : (
          <>
            {stale && pending && (
              <div className="version-notice">
                This matter brief changed after the suggestion was prepared. It cannot overwrite the
                newer version. Keep the current brief and ask Counsel OS for an updated suggestion.
              </div>
            )}
            <div className="brief-comparison-head">
              <strong>{pending ? 'Current brief' : 'Before this response'}</strong>
              <strong>{pending ? 'Suggested update' : 'Saved update'}</strong>
            </div>
            {(['status', 'summary', 'questions', 'nextActions'] as const).map((key) => (
              <section className="brief-comparison-row" key={key}>
                <h3>
                  {
                    {
                      status: 'Matter status',
                      summary: 'Summary',
                      questions: 'Open questions',
                      nextActions: 'Next steps',
                    }[key]
                  }
                </h3>
                <div>
                  <span className="brief-mobile-label">{pending ? 'Current' : 'Before this response'}</span>
                  <Prose
                    text={
                      key === 'status'
                        ? before[key].replace('-', ' ')
                        : before[key] || 'None recorded'
                    }
                  />
                </div>
                <div>
                  <span className="brief-mobile-label">{pending ? 'Suggested' : 'Saved update'}</span>
                  <Prose
                    text={
                      key === 'status'
                        ? proposal[key].replace('-', ' ')
                        : proposal[key] || 'None recorded'
                    }
                  />
                </div>
              </section>
            ))}
          </>
        )}
        {error && <ErrorNotice message={error} retry={() => setRetry((n) => n + 1)} />}
        <div className="dialog-actions">
          <button className="button button-quiet" disabled={busy} onClick={close}>
            Close
          </button>
          {pending && <button className="button" disabled={busy} onClick={() => void review('dismiss')}>
            Keep current brief
          </button>}
          {pending && <button
            className="button button-primary"
            disabled={busy || loading || stale || !!error}
            onClick={() => void review('apply')}
          >
            {busy ? 'Recording…' : 'Apply matter update'}
          </button>}
        </div>
      </div>
    </Modal>
  );
}

export function BriefProposalCard({
  turn,
  onChanged,
}: {
  turn: Turn;
  onChanged: () => void;
}): JSX.Element | null {
  const incoming = turn.state.briefProposal;
  const [proposal, setProposal] = useState(incoming),
    [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  useEffect(() => {
    setProposal(incoming);
  }, [incoming?.id, incoming?.review, incoming?.appliedRevisionId, incoming?.undoRevisionId]);
  if (!proposal || turn.status !== 'complete') return null;
  async function undo() {
    if (busy || !proposal) return;
    setBusy(true); setError('');
    try {
      const updated = await request<Turn>(`/turns/${turn.id}/brief-undo`, { proposalId: proposal.id });
      setProposal(updated.state.briefProposal); onChanged();
    } catch (error) { setError((error as Error).message); }
    finally { setBusy(false); }
  }
  const automatic = proposal.mode === 'automatic';
  return (
    <section className={automatic ? "chat-matter-update" : "chat-brief-card"} aria-label={automatic ? "Automatic matter update" : "Suggested matter update"}>
      <div className="chat-card-caption">
        <Icon name="matter" size={17} />
        <strong>
          {proposal.undoRevisionId ? 'Matter update undone' : proposal.review === 'pending'
            ? 'Keep the matter up to date'
            : proposal.review === 'applied'
              ? 'Matter brief updated'
              : 'Current brief kept'}
        </strong>
        {!automatic && <Badge tone={proposal.review === 'applied' ? 'green' : 'neutral'}>
          {proposal.review === 'pending'
            ? 'Needs review'
            : proposal.review === 'applied'
              ? 'Applied'
              : 'Not applied'}
        </Badge>}
      </div>
      {!automatic && <p>{proposal.reason}</p>}
      {proposal.review === 'pending' ? (
        <>
          <p className="fine-print">
            {proposal.deferredReason === 'concurrent-change'
              ? 'Another conversation or edit changed this matter. Your newer brief was kept.'
              : proposal.deferredReason === 'status-change'
                ? 'This update would change the matter’s status. Review it before applying.'
                : 'This change needs your decision. The saved matter is unchanged until you apply it.'}
          </p>
          <button className="button" onClick={() => setOpen(true)}>
            Review matter update
          </button>
        </>
      ) : (
        <p className="fine-print">
          {automatic ? (proposal.undoRevisionId ? 'Restored the earlier working notes. Both versions remain in history.' : 'Working notes saved automatically. Your practice standards are unchanged.') : <>
          {proposal.reviewedAt && fullDate(proposal.reviewedAt)}. The suggestion and this review
          remain in the conversation.
          </>}
        </p>
      )}
      {proposal.review === 'applied' && <div className="matter-update-actions">
        <button className="text-button" onClick={() => setOpen(true)}>See changes</button>
        {automatic && !proposal.undoRevisionId && <button className="text-button" disabled={busy} onClick={() => void undo()}>{busy ? 'Undoing…' : 'Undo update'}</button>}
      </div>}
      {error && <ErrorNotice message={error} />}
      <a className="knowledge-history-link" href={href('matters', { id: proposal.matterId })}>
        Open matter
      </a>
      {open && (
        <BriefComparison
          turn={turn}
          proposal={proposal}
          close={() => setOpen(false)}
          reviewed={(updated) => {
            setProposal(updated.state.briefProposal);
            setOpen(false);
            onChanged();
          }}
        />
      )}
    </section>
  );
}
