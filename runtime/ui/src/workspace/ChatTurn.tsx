import { useEffect, useMemo, useState } from 'react';
import { renderMarkdown } from '../vault/markdown';
import {
  request,
  href,
  type ChatCitation,
  type Knowledge,
  type KnowledgeRevision,
  type Turn,
  type WorkspaceProfile,
} from './api';
import { ProfileAttribution } from './Profile';
import { Badge, ErrorNotice } from './components';
import { Icon } from './icons';
import { OutputEditor } from './OutputEditor';
import { WordExport } from './WordExport';
import { SourceChangeNotice } from './SourceChangeNotice';
import { KnowledgeEditor } from './KnowledgeEditor';
import { BriefProposalCard } from './BriefProposal';
import { PreferenceProposalCard } from './PreferenceProposal';
import { PracticeDocumentProposalCard } from './PracticeDocumentProposal';
import { UserPrompt } from './UserPrompt';
import { RedlineCard } from './Redline';
import { DocumentRoundCard } from './DocumentRound';
import { AuthorityLookups } from './AuthorityLookups';
import { WebLookups } from './WebLookups';
import { SigningCheckCard } from './SigningCheck';
import { ChatActivity } from './ChatActivity';

export function KnowledgeReview({
  id,
  onChanged,
  profile,
  expectedRevisionId,
}: {
  id: string;
  onChanged: () => void;
  profile: WorkspaceProfile | null;
  expectedRevisionId?: string;
}): JSX.Element | null {
  const [item, setItem] = useState<Knowledge | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [proposed, setProposed] = useState<KnowledgeRevision | null>(null);
  const [reviewVersion, setReviewVersion] = useState(expectedRevisionId);
  useEffect(() => {
    const abort = new AbortController();
    Promise.all([
      request<Knowledge>(`/knowledge/${id}`, undefined, abort.signal),
      expectedRevisionId ? request<KnowledgeRevision>(`/knowledge-revisions/${expectedRevisionId}`, undefined, abort.signal) : Promise.resolve(null),
    ])
      .then(([value, version]) => { setItem(value); setProposed(version); setReviewVersion(expectedRevisionId); })
      .catch((e) => {
        if (!abort.signal.aborted) setError((e as Error).message);
      });
    return () => abort.abort();
  }, [id, expectedRevisionId]);
  const stale = !!item && !!reviewVersion && item.latest.id !== reviewVersion;
  const shown = proposed ?? item?.latest;
  async function review(action: 'approve' | 'reject') {
    if (!item || !profile || stale) return;
    setBusy(true);
    setError('');
    try {
      setItem(
        await request<Knowledge>(`/knowledge/${id}/review`, {
          expectedRevisionId: item.latest.id,
          action,
          expectedProfileRevisionId: profile.revisionId,
        }),
      );
      onChanged();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="chat-knowledge-card" aria-label="Practice review">
      <div className="chat-card-caption">
        <Icon name="knowledge" size={17} />
        <strong>
          {!stale && item?.latest.status === 'pending' ? (item.latest.number > 1 ? 'Update your practice material?' : 'Keep this for future work?') : 'Practice review'}
        </strong>
        <Badge tone={item?.latest.status === 'approved' ? 'green' : 'neutral'}>
          {stale ? 'Earlier version' : item?.latest.status ?? 'Loading'}
        </Badge>
      </div>
      {item && (
        <>
          <h3>{shown?.title}</h3>
          <p className="knowledge-scope">
            {item.matterId
              ? 'Applies only to this matter'
              : 'Practice-wide · may be used in other matters'}
          </p>
          <p className="proposal-body">{shown?.body}</p>
          {stale ? <p className="version-notice">This proposed version has since been reviewed or replaced. It cannot approve a newer edit. Open the version history to see the current material.</p> : item.latest.number > 1 && (
            <p className="fine-print">
              Showing the latest saved version, v{item.latest.number}. Earlier suggestions and
              review history are preserved.
            </p>
          )}
          {!stale && item.latest.status === 'pending' && (
            <>
              <p className="fine-print">{item.active || item.importedOriginal ? 'Your existing baseline remains in use until you approve this version.' : 'Not used as approved practice material until you approve.'}</p>
              <ProfileAttribution profile={profile} />
              <div className="review-buttons">
                {item.ownership === 'user' && (
                  <button className="button" disabled={busy} onClick={() => setEditing(true)}>
                    Edit proposal
                  </button>
                )}
                <button
                  className="button button-primary"
                  disabled={busy || !profile}
                  onClick={() => void review('approve')}
                >
                  Approve for practice
                </button>
                <button
                  className="button"
                  disabled={busy || !profile}
                  onClick={() => void review('reject')}
                >
                  Do not adopt
                </button>
              </div>
              <a className="knowledge-history-link" href={href('knowledge', { id: item.id })}>
                View versions and context
              </a>
            </>
          )}
          {(stale || item.latest.status !== 'pending') && (
            <a href={href('knowledge', { id })}>
              {item.latest.status === 'pending' ? 'View version history' : 'View recorded review'} <Icon name="arrow" size={13} />
            </a>
          )}
        </>
      )}
      {error && <ErrorNotice message={error} />}
      {editing && item && (
        <KnowledgeEditor
          item={item}
          close={() => setEditing(false)}
          saved={(value) => {
            setItem(value);
            setProposed(value.latest);
            setReviewVersion(value.latest.id);
            setEditing(false);
            onChanged();
          }}
        />
      )}
    </section>
  );
}

/** Sanitized prose; only verified server-provided markers become source controls. */
export function Answer({
  turn,
  inspect,
}: {
  turn: Turn;
  inspect: (citation: ChatCitation) => void;
}): JSX.Element {
  const html = useMemo(() => {
    const document = new DOMParser().parseFromString(
      renderMarkdown(turn.state.answer),
      'text/html',
    );
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const nodes: Text[] = [];
    while (walker.nextNode()) nodes.push(walker.currentNode as Text);
    for (const node of nodes) {
      if (node.parentElement?.closest('code, pre, a')) continue;
      const parts = node.data.split(/(\[S\d+\])/g);
      if (parts.length === 1) continue;
      const fragment = document.createDocumentFragment();
      for (const part of parts) {
        const citation = turn.state.citations.find((c) => `[${c.key}]` === part);
        if (!citation) {
          fragment.append(document.createTextNode(part));
          continue;
        }
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'inline-citation';
        button.dataset.citation = citation.key;
        button.textContent = part;
        button.setAttribute('aria-label', `Source ${citation.key}: ${citation.title}`);
        fragment.append(button);
      }
      node.replaceWith(fragment);
    }
    return document.body.innerHTML;
  }, [turn.state.answer, turn.state.citations]);
  return (
    <div
      className="chat-answer"
      onClick={(e) => {
        const button = (e.target as HTMLElement).closest<HTMLButtonElement>(
          'button[data-citation]',
        );
        const citation = turn.state.citations.find((c) => c.key === button?.dataset.citation);
        if (citation) inspect(citation);
      }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export function ChatTurn({
  turn,
  inspect,
  showContext,
  onChanged,
  profile,
}: {
  turn: Turn;
  inspect: (citation: ChatCitation) => void;
  showContext: () => void;
  onChanged: () => void;
  profile: WorkspaceProfile | null;
}): JSX.Element {
  const [copied, setCopied] = useState(false);
  const [savingOutput, setSavingOutput] = useState(false);
  const unknownMarkers = [...turn.state.answer.matchAll(/\[(S\d+)\]/g)].some(
    (match) => !turn.state.citations.some((c) => c.key === match[1]),
  );
  return (
    <article id={`turn-${turn.id}`} className="chat-turn" aria-label="Conversation exchange">
      <UserPrompt text={turn.request} attachmentCount={turn.attachments.length} />
      <div className="counsel-message">
        <div className="message-byline">
          <span className="counsel-avatar" aria-hidden="true">
            c.
          </span>
          <span className="counsel-byline-text">
            <strong>Counsel OS</strong>
            <span>
              {turn.status === 'running'
                ? 'Working'
                : turn.status === 'complete'
                  ? ''
                  : 'Incomplete response'}
            </span>
          </span>
        </div>
        <ChatActivity activity={turn.state.activity} citations={turn.state.citations} running={turn.status === 'running'} />
        {turn.state.answer ? (
          <Answer turn={turn} inspect={inspect} />
        ) : turn.status === 'running' ? (
          <p className="response-waiting" role="status">
            <span className="working-dot" />
            Preparing a response. You can work in another chat.
          </p>
        ) : null}
        {unknownMarkers && (
          <p className="citation-warning">
            Some source markers were not verified. Only clickable markers open checked excerpts.
          </p>
        )}
        {turn.state.error && <ErrorNotice message={turn.state.error} />}
        {turn.status === 'complete' &&
          turn.workId &&
          turn.state.citations.length > 0 && (
            <SourceChangeNotice workId={turn.workId} />
          )}
        {turn.state.citations.length > 0 && (
          <div className="chat-source-list" aria-label="Verified excerpts">
            {turn.state.citations.map((c) => (
              <button key={c.key} onClick={() => inspect(c)}>
                <span>{c.key}</span>
                {c.title}
                <Icon name="chevron" size={12} />
              </button>
            ))}
          </div>
        )}
        {turn.state.proposalIds.map((id) => (
          <KnowledgeReview key={id} id={id} expectedRevisionId={turn.state.proposalRevisions?.[id]} onChanged={onChanged} profile={profile} />
        ))}
        {turn.state.practiceUpdateConflicts?.map(item => <div className="version-notice" key={item.id}>
          “{item.title}” changed while this response was running. The newer practice version was kept; this proposed edit was not saved. <a href={href('knowledge', { id: item.id })}>Open current version</a>
        </div>)}
        {turn.state.briefProposal && <BriefProposalCard turn={turn} onChanged={onChanged} />}
        {turn.state.preferenceProposal && <PreferenceProposalCard turn={turn} onChanged={onChanged} />}
        {turn.state.practiceDocumentProposal && <PracticeDocumentProposalCard turn={turn} onChanged={onChanged} />}
        {turn.state.redline && <RedlineCard value={turn.state.redline} />}
        {turn.state.documentRound && <DocumentRoundCard value={turn.state.documentRound} />}
        {!!turn.state.authorityLookups?.length && <AuthorityLookups receipts={turn.state.authorityLookups} />}
        {!!turn.state.webLookups?.length && <WebLookups receipts={turn.state.webLookups} />}
        {turn.state.signatoryChecks?.map((value, index) => <SigningCheckCard key={index} value={value} />)}
        {turn.status === 'complete' && (
          <div className="chat-receipt">
            <Icon name="check" size={14} />
            {turn.state.output ? (
              <a className="chat-output-link" href={href('work', { id: turn.workId ?? undefined })}>
                Open output: {turn.state.output.title}
              </a>
            ) : (
              <>
                <span>Saved in conversation</span>
                <button onClick={() => setSavingOutput(true)}>Save as output</button>
              </>
            )}
            <button onClick={showContext}>
              {turn.state.context.filter((c) => c.ranges.length || turn.state.visualContext?.some(image => image.id === c.id)).length} records in context
            </button>
            <button
              onClick={() => {
                void navigator.clipboard
                  .writeText(turn.state.answer)
                  .then(() => setCopied(true))
                  .catch(() => setCopied(false));
              }}
            >
              {copied ? 'Copied' : 'Copy answer'}
            </button>
          </div>
        )}
        {savingOutput && turn.workId && (
          <OutputEditor
            workId={turn.workId}
            title={turn.request.slice(0, 160)}
            close={() => setSavingOutput(false)}
            saved={() => {
              setSavingOutput(false);
              onChanged();
            }}
          />
        )}
        {turn.status === 'complete' && turn.workId && !!turn.state.answer.trim() && (
          <WordExport workId={turn.workId} compact label={turn.state.redline ? 'Download answer as Word' : undefined} />
        )}
        {turn.state.omittedHistoryTurns > 0 && (
          <p className="fine-print">
            Context limit: {turn.state.omittedHistoryTurns} earlier completed exchanges were not
            sent with this response. They remain saved here.
          </p>
        )}
      </div>
    </article>
  );
}
