import { useEffect, useState } from 'react';
import { LEGACY_DOCUMENT_AUTHOR, PRODUCT_NAME } from '../../../src/core/brand';
import { request, type Turn } from './api';
import { ErrorNotice, Modal } from './components';
import { DocumentReader } from './DocumentReader';
import { AppliedPracticeDetails } from './PracticeDocument';
import { PracticeSupport } from './PracticeSupport';
import type { PracticeDocumentView, PracticeDocumentProposal } from '../../../src/workspace/practice-document';

function Review({ proposal, turnId, close, changed }: { proposal: PracticeDocumentProposal; turnId: string; close: () => void; changed: (turn: Turn) => void }) {
  const [current, setCurrent] = useState<PracticeDocumentView | null>(null), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const [showBefore, setShowBefore] = useState(false), [sharing, setSharing] = useState(proposal.before.useInChats);
  useEffect(() => {
    const abort = new AbortController();
    request<PracticeDocumentView>('/practice-document', undefined, abort.signal).then(setCurrent).catch(e => { if (!abort.signal.aborted) setError(e.message); });
    return () => abort.abort();
  }, []);
  const pending = proposal.review === 'pending', applied = proposal.review === 'applied';
  const stale = current && current.basis !== (pending ? proposal.before.basis : proposal.appliedBasis);
  const details = showBefore ? proposal.before : { identityName: proposal.identityName === undefined ? proposal.before.identityName : proposal.identityName,
    word: proposal.word ?? proposal.before.word, entities: proposal.entities ?? proposal.before.entities };
  const hasDetails = proposal.identityName !== undefined || !!proposal.word || !!proposal.entities;
  async function review(action: 'apply' | 'dismiss' | 'undo') {
    setBusy(true); setError('');
    try { changed(await request<Turn>(`/turns/${turnId}/practice-review`, { proposalId: proposal.id, action, ...(action === 'apply' ? { useInChats: sharing } : {}) })); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  return <Modal title="Review your practice update" onClose={close} busy={busy}>
    <div className="record-form practice-document-review"><p>{proposal.reason}</p>
      <p className="fine-print">Review the full text{hasDetails ? ' and exact applied details' : ''}. Nothing changes until you confirm. Earlier work keeps its original context.</p>
      <div className="document-view-controls" role="group" aria-label="Compare practice text">
        <button type="button" aria-pressed={!showBefore} onClick={() => setShowBefore(false)}>Proposed text</button>
        <button type="button" aria-pressed={showBefore} onClick={() => setShowBefore(true)}>Previous text</button></div>
      <DocumentReader text={(showBefore ? proposal.before.body : proposal.body) || 'No saved text.'} markdown display="reading" />
      <section className="practice-review-details"><h3>{showBefore ? 'Previous applied details' : hasDetails ? 'Proposed applied details' : 'Applied details stay unchanged'}</h3><AppliedPracticeDetails value={details} /></section>
      {[LEGACY_DOCUMENT_AUTHOR, PRODUCT_NAME].includes(details.word.author) && <p className="fine-print">New Word comments and changes will say “{details.word.author}”. If you want your own name, ask for that change in chat before confirming.</p>}
      <PracticeSupport text={showBefore ? proposal.before.body : proposal.body} />
      {pending && <label className="checkbox-label"><input type="checkbox" checked={sharing} disabled={busy} onChange={e => setSharing(e.target.checked)} />Use this document automatically in new responses</label>}
      {!current && !error && <p role="status">Checking the current version…</p>}
      {stale && (pending || applied) && <p className="version-notice">Your practice has changed since this suggestion. It cannot overwrite the newer version. Ask Counsel OS to revise it against your current document.</p>}
      {error && <ErrorNotice message={error} />}
      <div className="dialog-actions"><button className="button button-quiet" disabled={busy} onClick={close}>Close</button>
        {pending && <button className="button" disabled={busy} onClick={() => void review('dismiss')}>Keep current practice</button>}
        {pending && <button className="button button-primary" disabled={busy || !current || !!stale || !!error} onClick={() => void review('apply')}>Save for future work</button>}
        {applied && <button className="button" disabled={busy || !current || !!stale || !!error} onClick={() => void review('undo')}>Undo this update</button>}</div>
    </div>
  </Modal>;
}

export function PracticeDocumentProposalCard({ turn, onChanged }: { turn: Turn; onChanged: () => void }) {
  const [proposal, setProposal] = useState(turn.state.practiceDocumentProposal), [open, setOpen] = useState(false);
  useEffect(() => setProposal(turn.state.practiceDocumentProposal), [turn.state.practiceDocumentProposal]);
  if (!proposal || turn.status !== 'complete') return null;
  const pending = proposal.review === 'pending';
  return <section className="chat-brief-card" aria-label="Practice document update">
    <h3>{pending ? 'Update your practice?' : proposal.review === 'applied' ? 'Your practice was updated' : proposal.review === 'undone' ? 'Practice update undone' : 'Current practice kept'}</h3>
    <p>{pending ? 'Counsel OS has drafted an update. Review it before it becomes a standing instruction.' : 'The text and its earlier version remain here for reference.'}</p>
    <button className="button" onClick={() => setOpen(true)}>{pending ? 'Review practice update' : 'View practice update'}</button>
    {open && <Review proposal={proposal} turnId={turn.id} close={() => setOpen(false)} changed={next => { setProposal(next.state.practiceDocumentProposal); setOpen(false); onChanged(); }} />}
  </section>;
}
