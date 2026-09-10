import { useEffect, useState } from 'react';
import { request, href, type Turn } from './api';
import type { WorkingPreferences } from '../../../src/workspace/working-preferences';
import { INSTRUCTION_LABELS } from '../../../src/workspace/preference-proposals';
import type { PreferenceProposal } from '../../../src/workspace/preference-proposals';
import { Badge, ErrorNotice, Modal, Prose } from './components';
import { Icon } from './icons';

function PreferenceComparison({ proposal, turnId, close, reviewed }: {
  proposal: PreferenceProposal; turnId: string; close: () => void; reviewed: (turn: Turn) => void;
}): JSX.Element {
  const [current, setCurrent] = useState<WorkingPreferences | null>(null);
  const [loading, setLoading] = useState(true), [error, setError] = useState(''), [busy, setBusy] = useState(false), [retry, setRetry] = useState(0);
  useEffect(() => {
    const abort = new AbortController(); setLoading(true); setError('');
    request<WorkingPreferences | null>('/working-preferences', undefined, abort.signal).then(next => {
      if (!abort.signal.aborted) { setCurrent(next); setLoading(false); }
    }).catch(e => { if (!abort.signal.aborted) { setError((e as Error).message); setLoading(false); } });
    return () => abort.abort();
  }, [retry]);
  const pending = proposal.review === 'pending', applied = proposal.review === 'applied';
  const expected = pending ? proposal.basedOnRevisionId : proposal.appliedRevisionId;
  const stale = !loading && (current?.revisionId ?? null) !== expected;
  const keys = Object.keys(proposal.changes) as Array<keyof typeof INSTRUCTION_LABELS>;
  const review = async (action: 'apply' | 'dismiss' | 'undo') => {
    if (busy) return; setBusy(true); setError('');
    try { reviewed(await request<Turn>(`/turns/${turnId}/preference-review`, { proposalId: proposal.id, action })); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };
  return <Modal title="Review working preferences" onClose={close} busy={busy}>
    <div className="record-form brief-comparison-form preference-comparison-form">
      <p className="form-intro">{proposal.reason}</p>
      <p className="fine-print">Applies to future work across your practice. It does not edit saved Practice positions, entity signing rules, Word attribution or filenames. Earlier answers keep their original instructions.</p>
      <blockquote className="preference-request-quote">{proposal.requestQuote}</blockquote>
      {loading && <p role="status">Checking current preferences…</p>}
      {stale && (pending || applied) && <p className="version-notice">Your preferences have changed since this suggestion. It cannot overwrite the newer version. <a href={href('knowledge', { section: 'preferences' })}>Open current preferences</a>.</p>}
      <div className="brief-comparison-head"><strong>Before this response</strong><strong>Suggested instructions</strong></div>
      {keys.map(key => <section className="brief-comparison-row" key={key}>
        <h3>{INSTRUCTION_LABELS[key]}</h3>
        <div><span className="brief-mobile-label">Before</span><Prose text={proposal.before[key] || 'No saved instruction'} /></div>
        <div><span className="brief-mobile-label">Suggested</span><Prose text={proposal.changes[key] || 'Clear this instruction'} /></div>
      </section>)}
      {error && <ErrorNotice message={error} retry={() => setRetry(n => n + 1)} />}
      <div className="dialog-actions">
        <button className="button button-quiet" disabled={busy} onClick={close}>Close</button>
        {pending && <button className="button" disabled={busy} onClick={() => void review('dismiss')}>Keep current preferences</button>}
        {pending && <button className="button button-primary" disabled={busy || loading || stale || !!error} onClick={() => void review('apply')}>{busy ? 'Saving…' : 'Save for future work'}</button>}
        {applied && <button className="button" disabled={busy || loading || stale || !!error} onClick={() => void review('undo')}>Undo preference update</button>}
      </div>
    </div>
  </Modal>;
}

export function PreferenceProposalCard({ turn, onChanged }: { turn: Turn; onChanged: () => void }): JSX.Element | null {
  const incoming = turn.state.preferenceProposal;
  const [proposal, setProposal] = useState(incoming), [open, setOpen] = useState(false);
  useEffect(() => setProposal(incoming), [incoming?.id, incoming?.review]);
  if (!proposal || turn.status !== 'complete') return null;
  const pending = proposal.review === 'pending';
  return <section className="chat-brief-card" aria-label="Working preference update">
    <div className="chat-card-caption"><Icon name="knowledge" size={17} /><strong>
      {pending ? 'Remember this for future work?' : proposal.review === 'applied' ? 'Working preferences updated' : proposal.review === 'undone' ? 'Preference update undone' : 'Current preferences kept'}
    </strong><Badge tone={proposal.review === 'applied' ? 'green' : 'neutral'}>{pending ? 'Not saved' : proposal.review === 'applied' ? 'Saved' : 'Unchanged'}</Badge></div>
    <p>{Object.keys(proposal.changes).map(key => INSTRUCTION_LABELS[key as keyof typeof INSTRUCTION_LABELS]).join(' · ')}</p>
    <p className="fine-print">{pending ? 'Review the exact wording before it becomes a default. Your saved preferences are unchanged.' : 'This change and its earlier wording remain in the conversation. Saved Practice positions are unchanged.'}</p>
    <button className="button" onClick={() => setOpen(true)}>{pending ? 'Review preference update' : 'See preference changes'}</button>
    {open && <PreferenceComparison proposal={proposal} turnId={turn.id} close={() => setOpen(false)} reviewed={next => {
      setProposal(next.state.preferenceProposal); setOpen(false); onChanged();
    }} />}
  </section>;
}
