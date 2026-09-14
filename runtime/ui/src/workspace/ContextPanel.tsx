import { useEffect, useRef, useState } from "react";
import { ImagePreview } from './ImagePreview';
import { isImageMedia } from '../../../src/workspace/image-types';
import {
  href,
  request,
  type ContextRecord,
  type Source,
  type SourceRevision,
  type KnowledgeRevision,
  type Work,
  type Conversation,
  type Turn,
  type WorkspaceProfile,
  type Snapshot,
} from "./api";
import { preferenceSnapshot } from '../../../src/workspace/working-preferences';
import { Badge, ErrorNotice, Modal, Status } from "./components";
import { Icon } from "./icons";
import { ProfileDetails } from "./Profile";
import { DocumentReader } from './DocumentReader';
import { ExtractionInfo } from "./ExtractionInfo";
import { AvailableRecords } from "./AvailableRecords";
import { WorkingGuides } from "./WorkingGuides";

export interface Inspection {
  kind: ContextRecord["kind"];
  id: string;
  quote?: string;
  start?: number;
  title?: string;
}
export interface CurrentChatContext {
  matterTitle?: string;
  documents: {id: string; title: string; pending: boolean; textStatus?: string; image?: boolean}[];
  workingPreferences: Snapshot['workingPreferences'];
  entityRegistry: Snapshot['entityRegistry'];
}
function ProfileContext({
  profile,
  turn,
}: {
  profile: WorkspaceProfile | null;
  turn: Turn | null;
}): JSX.Element {
  const included = turn
    ? turn.state.profileContext
    : profile?.applyToChats
      ? profile
      : null;
  const status = turn
    ? turn.state.profileStatus
    : profile
      ? profile.applyToChats
        ? "included"
        : "disabled"
      : "not-set";
  return (
    <section className="context-profile">
      {included ? (
        <details className="profile-options">
          <summary>
            {turn
              ? "Profile context for this response"
              : "Profile for the next response"}{" "}
            · v{included.version}
          </summary>
          <ProfileDetails profile={included} />
          <p className="fine-print">
            {turn
              ? "Snapshot prepared when you sent this message. Later profile edits do not change it."
              : "These saved details will be shared with your selected AI connection."}
          </p>
        </details>
      ) : (
        <p className="fine-print">
          {status === "disabled"
            ? turn
              ? "Profile sharing was off for this response. No saved profile was included."
              : "Profile sharing is off. Your saved profile will not be included in the next response."
            : turn && status === undefined
              ? "Profile context was not recorded for this earlier response."
              : turn
                ? "No profile was set up when this message was sent."
                : "No profile is set up. Add it in Practice → Profile & preferences."}
        </p>
      )}
    </section>
  );
}
export function ContextPanel({
  profile,
  conversation,
  turn,
  latestTurn,
  selectTurn,
  current,
  inspection,
  close,
  inspect,
}: {
  profile: WorkspaceProfile | null;
  conversation: Pick<
    Conversation,
    "scope" | "matterId" | "clientContext" | "selectedMatters"
  > | null;
  turn: Turn | null;
  latestTurn: Turn | null;
  selectTurn: (turnId?: string) => void;
  current: CurrentChatContext;
  inspection: Inspection | null;
  close: () => void;
  inspect: (value: Inspection) => void;
}): JSX.Element {
  const [mobile, setMobile] = useState(
    () => window.matchMedia("(max-width: 1100px)").matches,
  );
  const panel = useRef<HTMLElement>(null);
  const boundary = turn?.state.scopeContext ?? conversation;
  const selectedMatters = boundary?.selectedMatters ?? boundary?.clientContext?.matters;
  const preferences = turn ? turn.state.workingPreferences : preferenceSnapshot(current.workingPreferences ?? null, profile);
  const title = inspection ? 'Source passage' : turn ? 'Response context' : 'Chat context';
  useEffect(() => {
    const query = window.matchMedia("(max-width: 1100px)");
    const change = () => setMobile(query.matches);
    query.addEventListener("change", change);
    return () => query.removeEventListener("change", change);
  }, []);
  useEffect(() => {
    if (!mobile) panel.current?.focus();
  }, [mobile, inspection]);
  const content = inspection ? (
    <Passage
      key={`${inspection.kind}:${inspection.id}:${inspection.start}`}
      inspection={inspection}
    />
  ) : (
    <div className="context-panel-body">
      {latestTurn && <div className="context-view-switch" role="group" aria-label="Context view">
        <button aria-pressed={!turn} onClick={() => selectTurn()}>Next message</button>
        <button aria-pressed={turn?.id === latestTurn.id} onClick={() => selectTurn(latestTurn.id)}>Latest response</button>
      </div>}
      <span className="panel-eyebrow">{turn ? 'Recorded for this response' : 'Available for your next message'}</span>
      {turn && <p className="context-response-prompt">{turn.request}</p>}
      <h4 className="context-section-label">Scope</h4>
      <h3>
        {boundary?.scope === "workspace"
          ? "Across your workspace"
          : boundary?.scope === "client"
            ? `${boundary.clientContext?.name ?? "Client"} · selected matters`
            : boundary?.scope === "matters"
              ? `${selectedMatters?.length ?? 0} selected matters`
            : boundary?.scope === "matter"
              ? (turn ? turn.state.matterContext?.title : current.matterTitle) ?? 'This matter'
              : "This conversation"}
      </h3>
      <p>
        Other matters are{" "}
        {boundary?.scope === "workspace"
          ? "included by your selection"
          : boundary?.scope === "client" || boundary?.scope === "matters"
            ? "excluded unless listed below or explicitly attached"
            : "excluded unless you explicitly attach a document or make it a practice-wide template"}
        .{" "}
        {turn
          ? "This is the scope recorded for this response."
          : boundary?.scope === 'matters' || boundary?.scope === 'client'
            ? 'This selection is fixed for the conversation. Start a new chat to use a different selection.'
            : "Adding this conversation to a matter requires your confirmation."}
      </p>
      {selectedMatters && (
        <details className="shared-matter-context" open={boundary?.scope === 'matters' ? true : undefined}>
          <summary>
            {boundary?.clientContext ? `${selectedMatters.length} selected matters` : `Matters in this chat (${selectedMatters.length})`}
          </summary>
          <p>
            Only this selection is available, not every client or future matter.
            Titles are context, not evidence of a record read.
          </p>
          {boundary?.clientContext?.summary && (
            <>
              <h4>Client background included</h4>
              <p>{boundary.clientContext.summary}</p>
            </>
          )}
          {selectedMatters.map((m) => (
            <p key={m.id}>
              <a href={href("matters", { id: m.id })}>{m.title}</a>
            </p>
          ))}
        </details>
      )}
      {!turn && <>
        <h4 className="context-section-label">Practice</h4>
        <p>Your saved working instructions are supplied automatically when set. Relevant approved and imported practice material, templates, and saved law can be retrieved as needed. This does not mean every file is read.</p>
        <p>Chats save automatically. Changes to reusable practice material require your approval.</p>
        <p>Counsel OS can retrieve relevant public links from your request or documents it reads. Only the URL is sent to the site, without document text or browser login. Retrieved pages are saved in Sources and shown with the response; login-protected or interactive pages may still need an upload.</p>
        <a href={href('knowledge', {section: 'preferences'})}>Manage profile &amp; preferences</a>
        <p className="fine-print">{current.entityRegistry?.availableToChats
          ? 'Your signing directory is available for lookup when relevant.'
          : 'Signing directory sharing is off or has not been set up.'}</p>
      </>}
      {!turn?.state.practiceDocument?.saved && <ProfileContext profile={profile} turn={turn} />}
      {turn?.state.practiceDocument && (turn.state.practiceDocument.saved || turn.state.practiceDocumentRead) && <details className="shared-matter-context" aria-label="Practice document context">
        <summary>Your practice{turn.state.practiceDocument.saved ? ` · version ${turn.state.practiceDocument.saved.version}` : ''}</summary>
        <p>{turn.state.practiceDocumentRead ? 'This exact text was supplied for this response. This is a context receipt, not a guarantee that the model followed every instruction.' : 'Your practice document was not shared with this response.'}</p>
        {turn.state.practiceDocumentRead && <DocumentReader text={turn.state.practiceDocument.body} markdown />}
        <p>New Word changes and comments: {turn.state.practiceDocument.word.author}. Earlier reviewers retain their names.</p>
        <a href={href('knowledge', { section: 'preferences' })}>Open your practice</a>
      </details>}
      {turn?.state.entityRegistry && <details className="shared-matter-context" aria-label="Entity directory context">
        <summary>Signing entities · version {turn.state.entityRegistry.version}</summary>
        <p>Names were available for discovery. Only entities listed as read below had their full saved details supplied through the entity tool. These are practice-wide user records, not verified authority.</p>
        {turn.state.entityRegistry.entities.filter(entity => entity.active).map(entity => <div key={entity.id}>
          <p>{entity.name}{turn.state.entitiesRead?.includes(entity.id) ? ' · Details read' : ' · Name available'}</p>
          {turn.state.entitiesRead?.includes(entity.id) && <details><summary>Exact saved details</summary>
            <dl className="entity-facts">{([['jurisdiction', 'Jurisdiction'], ['registeredAddress', 'Registered address'], ['noticeAddress', 'Notice address'], ['noticeEmail', 'Notice email'], ['sourceNote', 'Source or basis']] as const).map(([key,label]) =>
              <div key={key}><dt>{label}</dt><dd>{entity[key] || 'Not recorded'}</dd></div>)}</dl>
          </details>}
        </div>)}
        <a href={href('knowledge', { section: 'preferences', view: 'entities' })}>Edit entities and rules for future responses</a>
      </details>}
      {preferences && !turn?.state.practiceDocument?.saved && <details className="shared-matter-context" aria-label={turn ? 'Working instructions included' : 'Working instructions for next message'}>
        <summary>Working preferences · version {preferences.version}</summary>
        <p>{turn ? 'Included automatically, not found through search.' : 'These saved instructions will be supplied with your next message.'} Writing instructions apply by audience; signing guidance applies when selecting a signatory; review instructions apply to the relevant document work. {turn ? 'This receipt shows what was supplied, not a guarantee of model compliance.' : 'Changes in Practice apply to future responses.'}</p>
        {preferences.writingInstructions && <><h4>Writing instructions</h4><DocumentReader text={preferences.writingInstructions} markdown /></>}
        {preferences.signingInstructions && <><h4>Signing guidance</h4><DocumentReader text={preferences.signingInstructions} markdown /></>}
        {preferences.generalReview && <><h4>General document review</h4><DocumentReader text={preferences.generalReview} markdown /></>}
        {preferences.ndaReview && <><h4>NDA review instructions</h4><DocumentReader text={preferences.ndaReview} markdown /></>}
        <p>Word changes and comments: {preferences.word.author}. Filename pattern: {preferences.word.filenamePattern}.</p>
        <p>Filename labels: {preferences.word.redlineLabel ?? 'redline'} for tracked changes; {preferences.word.draftLabel ?? 'draft'} for answer exports.</p>
        <a href={href('knowledge', { section: 'preferences', view: 'documents' })}>Edit working preferences for future responses</a>
        <p><a href={href('knowledge', { section: 'preferences', view: 'writing' })}>Edit writing and signing guidance</a></p>
      </details>}
      {!!turn?.state.contextLibrary?.records.length && (
        <details
          className="shared-matter-context"
          aria-label="Reusable practice and law context"
        >
          <summary>
            {turn.state.contextLibrary.total} practice and saved law records
            available
          </summary>
          <p>
            Imported standards, methods, clause language and saved law
            references are available without attaching each file. These are
            record names, not a claim that all were read. Imported law has not
            been checked for currency. New model proposals do not change your
            standards.
          </p>
          {turn.state.contextLibrary.records.map((record) => (
            <p key={record.id}>
              <button
                className="text-button"
                onClick={() =>
                  inspect({
                    kind: record.kind,
                    id: record.id,
                    title: record.title,
                  })
                }
              >
                {record.title}
              </button>
              <small> · {record.category}</small>
            </p>
          ))}
        </details>
      )}
      {turn?.state.preparedContext?.retrieval?.plan && <details className="fine-print context-recall" aria-label="Search approach">
        <summary>How Counsel OS searched</summary>
        <p>{turn.state.preparedContext.retrieval.plan.status === 'expanded'
          ? 'Used your selected AI connection to suggest alternate terms, then combined those matches with the original search inside this chat’s permitted context.'
          : turn.state.preparedContext.retrieval.plan.note}</p>
        {!!turn.state.preparedContext.retrieval.plan.queries.length && <ul>{turn.state.preparedContext.retrieval.plan.queries.map((query,index)=><li key={index}>{query}</li>)}</ul>}
        {turn.state.preparedContext.retrieval.plan.limited && <p>Only a bounded part of the question and recent context was used to plan this search.</p>}
        <p>Search terms are not sources or evidence. Only the actual passages read below can support citations. This is not an exhaustive search.</p>
      </details>}
      {!!turn?.state.preparedContext?.records.length && (
        <div className="fine-print" aria-label="Automatic context preparation">
          <p>Counsel OS prepared {turn.state.preparedContext.records.length} {turn.state.preparedContext.records.length === 1 ? 'record' : 'records'}{' '}
            automatically before answering. Exact passages appear below.</p>
          {!!turn.state.preparedContext.retrieval?.evidenceReads?.length && (
            <p>Followed saved evidence links for {turn.state.preparedContext.retrieval.evidenceReads.length} additional {turn.state.preparedContext.retrieval.evidenceReads.length === 1 ? 'passage' : 'passages'}.
              Newer versions, when available, are separate checks—not the original supporting evidence.</p>
          )}
          {!!turn.state.preparedContext.retrieval?.selectedMatters &&
            (turn.state.preparedContext.retrieval.matterNotesRead ?? 0) < turn.state.preparedContext.retrieval.selectedMatters && (
            <p>Starting notes cover {turn.state.preparedContext.retrieval.matterNotesRead ?? 0} of {turn.state.preparedContext.retrieval.selectedMatters} selected matters.
              Other matter files may still be available to read.</p>
          )}
          {!!(turn.state.preparedContext.retrieval?.unavailableLinks || turn.state.preparedContext.retrieval?.omittedLinks) && (
            <p>Some supporting links could not be followed within the current access, version or starting-read limits.</p>
          )}
          <p>This starting context is not an exhaustive review.</p>
        </div>
      )}
      <WorkingGuides guides={turn?.state.guidesRead ?? []} />
      {turn?.state.discoveryContext && (
        <AvailableRecords
          value={turn.state.discoveryContext}
          inspect={inspect}
        />
      )}
      {!!turn?.state.templateContext?.length && (
        <details className="shared-matter-context">
          <summary>
            {turn.state.templateContext.length} practice templates available for
            retrieval
          </summary>
          <p>
            This is the template list pinned when you sent this message—not a
            claim that every template was read. Read passages appear below.
          </p>
          {turn.state.templateContext.map((item) => (
            <p key={item.id}>
              <a href={href("references", { revision: item.sourceRevisionId })}>
                {item.title} · template version {item.number}
              </a>
            </p>
          ))}
        </details>
      )}
      {turn ? (
        <>
          {turn.state.matterContext && (
            <details className="shared-matter-context">
              <summary>Matter summary sent with this response</summary>
              <p>
                {turn.state.matterContext.summary || "No summary recorded."}
              </p>
              {turn.state.matterContext.status && (
                <p>Status: {turn.state.matterContext.status}</p>
              )}
              {turn.state.matterContext.questions && (
                <>
                  <h4>Open questions</h4>
                  <p>{turn.state.matterContext.questions}</p>
                </>
              )}
              {turn.state.matterContext.nextActions && (
                <>
                  <h4>Next steps</h4>
                  <p>{turn.state.matterContext.nextActions}</p>
                </>
              )}
              {turn.state.matterContext.truncated && (
                <p>Only the first 12,000 characters were sent.</p>
              )}
            </details>
          )}
          <div className="context-included">
            <Icon name="chat" size={16} />
            <span>
              {turn.state.historyTurns} earlier completed exchanges sent with
              this response
            </span>
          </div>
          <div className="section-heading">
            <h3>Documents & records</h3>
            <span>{turn.state.context.length}</span>
          </div>
          <p className="fine-print">
            Attached means available to read. Prepared means collected for this
            response; read means returned by a tool. Images labeled “supplied to model” were included visually, without OCR or exact-text verification. Exact ranges show text coverage,
            not a claim that the whole document was reviewed.
          </p>
          {turn.state.context.map((record) => (
            <button
              className="context-record"
              key={`${record.kind}:${record.id}`}
              onClick={() =>
                inspect({
                  kind: record.kind,
                  id: record.id,
                  title: record.title,
                })
              }
            >
              <Icon
                name={record.kind === "knowledge" ? "knowledge" : "reference"}
                size={18}
              />
              <span>
                <strong>{record.title}</strong>
                <small>
                  {record.category}
                  {record.version ? ` · v${record.version}` : ""}
                </small>
                <span className="context-record-state">
                  {turn.state.visualContext?.some(image => image.id === record.id) ? `Image ${turn.state.visualContext.find(image => image.id === record.id)!.number} · ${turn.status === 'complete' ? 'supplied to model' : 'prepared image input'}` : record.ranges.length
                    ? `${turn.state.preparedContext?.records.some((item) => item.id === record.id && item.kind === record.kind) ? "Prepared" : "Read"} · ${record.ranges.map((r) => `${r.start}–${r.end}`).join(", ")}`
                    : "Attached · not read yet"}
                </span>
                <Status value={record.status} />
                {record.newerVersionAvailable && (
                  <Badge tone="amber">Newer version available when read</Badge>
                )}
                {record.hasNewerCitedSources && (
                  <Badge tone="amber">Relies on superseded source text</Badge>
                )}
              </span>
              <Icon name="chevron" size={12} />
            </button>
          ))}
          {!turn.state.context.length && (
            <p>No document passages have been read for this response.</p>
          )}
          <p className="fine-print">Connection: {turn.state.model}</p>
        </>
      ) : <>
        <h4 className="context-section-label">Added documents · {current.documents.length}</h4>
        <p>Documents you add extend this chat’s scope. They remain available in later messages in this conversation; they do not change your practice standards.</p>
        {current.documents.map(document => <button className="context-record" key={document.id} onClick={() => inspect({kind:'source', id: document.id})}>
          <Icon name="reference" size={18} /><span><strong>{document.title}</strong>
            <small>{document.pending ? 'Added for next message · not sent yet' : 'Already attached in this chat'}</small>
            {document.textStatus === 'partial' && <Badge tone="amber">Partial text</Badge>}
            {document.image ? <Badge>Image · shared when you send</Badge> : document.textStatus === 'unavailable' && <Badge tone="amber">No readable text</Badge>}
          </span>
        </button>)}
        {!current.documents.length && <p>No documents added. Use Add documents or drop files into the message box.</p>}
        <p className="fine-print">Sending a message shares its included history and selected context with your AI connection. Browsing this panel makes no model call. Response context records which passages were prepared or read.</p>
      </>}
    </div>
  );
  if (mobile)
    return (
      <Modal
        title={title}
        onClose={close}
      >
        {content}
      </Modal>
    );
  return (
    <aside
      ref={panel}
      tabIndex={-1}
      className="chat-context-panel"
      aria-label={title}
      onKeyDown={(e) => {
        if (e.key === "Escape") close();
      }}
    >
      <div className="context-panel-heading">
        <h2>{title}</h2>
        <button
          className="icon-button"
          aria-label="Close context"
          onClick={close}
        >
          <Icon name="close" size={18} />
        </button>
      </div>
      {content}
    </aside>
  );
}

function Passage({ inspection }: { inspection: Inspection }): JSX.Element {
  const [record, setRecord] = useState<
    SourceRevision | KnowledgeRevision | Work | null
  >(null);
  const [error, setError] = useState("");
  const [currentVersion, setCurrentVersion] = useState<number | null>(null);
  useEffect(() => {
    const abort = new AbortController();
    const path =
      inspection.kind === "source"
        ? "source-revisions"
        : inspection.kind === "knowledge"
          ? "knowledge-revisions"
          : "work";
    request<SourceRevision | KnowledgeRevision | Work>(
      `/${path}/${inspection.id}`,
      undefined,
      abort.signal,
    )
      .then(async (value) => {
        if (abort.signal.aborted) return;
        setRecord(value);
        if ("sourceId" in value) {
          const source = await request<Source>(
            `/sources/${value.sourceId}`,
            undefined,
            abort.signal,
          );
          if (!abort.signal.aborted) setCurrentVersion(source.latest.number);
        }
      })
      .catch((e) => {
        if (!abort.signal.aborted) setError((e as Error).message);
      });
    return () => abort.abort();
  }, [inspection.id, inspection.kind]);
  const text = record
    ? "answer" in record
      ? record.answer
      : record.body
    : null;
  const start = inspection.start ?? 0;
  const valid =
    !!inspection.quote &&
    text?.slice(start, start + inspection.quote.length) === inspection.quote;
  return (
    <div className="context-panel-body passage-reader">
      {error && <ErrorNotice message={error} />}
      {record ? (
        <>
          <span className="panel-eyebrow">
            {inspection.kind === "knowledge"
              ? "Practice material"
              : inspection.kind === "work"
                ? "Prior work"
                : "Saved source"}
          </span>
          <h3>{record.title}</h3>
          {"sourceId" in record && <ExtractionInfo revision={record} />}
          <div className="passage-meta">
            <Badge>
              Immutable saved version
              {"number" in record ? ` · v${record.number}` : ""}
            </Badge>
            {"textStatus" in record && <Status value={isImageMedia(record.provenance.mediaType) ? 'image' : record.textStatus} />}
          </div>
          {currentVersion !== null &&
            "number" in record &&
            currentVersion !== record.number && (
              <p className="citation-warning">
                This is an earlier version. The current source is v
                {currentVersion}; this citation remains pinned to v
                {record.number}.
              </p>
            )}
          {"provenance" in record && (
            <dl>
              <dt>Origin</dt>
              <dd>{record.provenance.origin}</dd>
              {record.provenance.author && (
                <>
                  <dt>Author</dt>
                  <dd>{record.provenance.author}</dd>
                </>
              )}
            </dl>
          )}
          {valid && (
            <div className="verified-passage">
              <span>
                <Icon name="check" size={14} />
                Exact text verified · characters {start}–
                {start + inspection.quote!.length}
              </span>
              <blockquote>{inspection.quote}</blockquote>
            </div>
          )}
          {"sourceId" in record && isImageMedia(record.provenance.mediaType) && <ImagePreview id={record.id} title={record.title} />}
          <h4>{"sourceId" in record && isImageMedia(record.provenance.mediaType) ? 'Text availability' : valid ? "Surrounding text" : "Saved text"}</h4>
          <div className="passage-text">
            {text === null ? (
              "sourceId" in record && isImageMedia(record.provenance.mediaType) ? 'This original is shared visually when attached to a chat. No OCR or exact text citations are available.' : "No readable text is available."
            ) : valid ? (
              <>
                {text.slice(Math.max(0, start - 1000), start)}
                <mark>{inspection.quote}</mark>
                {text.slice(
                  start + inspection.quote!.length,
                  start + inspection.quote!.length + 1500,
                )}
              </>
            ) : (
              text.slice(0, 24_000)
            )}
          </div>
          {!valid && (text?.length ?? 0) > 24_000 && (
            <p className="fine-print">
              Reader preview: first 24,000 characters. The saved original text
              is unchanged.
            </p>
          )}
          <p className="fine-print">
            Exact text matching verifies the excerpt, not the legal conclusion
            or whether this source remains current.
          </p>
        </>
      ) : (
        !error && <p>Opening saved passage…</p>
      )}
    </div>
  );
}
