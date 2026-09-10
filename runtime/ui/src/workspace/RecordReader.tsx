import { useEffect, useState, type FormEvent } from "react";
import { MatterPicker } from "./MatterPicker";
import {
  href,
  go,
  request,
  type Evidence,
  type Knowledge,
  type KnowledgeRevision,
  type Route,
  type Snapshot,
  type Source,
  type SourceRevision,
  type Work,
} from "./api";
import {
  Badge,
  ErrorNotice,
  fullDate,
  kindLabel,
  Prose,
  Status,
} from "./components";
import { Icon } from "./icons";
import { ProfileAttribution } from "./Profile";
import { ExtractionInfo } from "./ExtractionInfo";
import { WordExport } from "./WordExport";
import { SourceVersions } from "./SourceVersions";
import { SourceChangeNotice } from "./SourceChangeNotice";
import { KnowledgeVersions } from "./KnowledgeVersions";
import {
  DocumentReader,
  practiceUsesMarkdown,
  sourceUsesMarkdown,
} from "./DocumentReader";
import { TemplateEditor } from "./Templates";
import { SourceLocation } from "./SourceLibrary";
import { SourceMatters } from './SourceMatters';
import { SourceLinks } from './SourceLinks';
import { RecordActions } from './RecordActions';
import { PracticeOriginals } from './PracticeOriginals';

type Detail =
  | { kind: "references"; record: Source; revision: SourceRevision }
  | { kind: "knowledge"; record: Knowledge; revision: KnowledgeRevision; baseline?: SourceRevision }
  | { kind: "work"; record: Work };

function EvidenceLink({ evidence }: { evidence: Evidence }): JSX.Element {
  const target = evidence.target;
  const url =
    target.kind === "work"
      ? href("work", { id: target.workId })
      : href(target.kind === "source" ? "references" : "knowledge", {
          revision: target.revisionId,
        });
  return (
    <a className="evidence-card" href={url}>
      <span className="evidence-kind">
        <Icon
          name={
            target.kind === "source"
              ? "reference"
              : target.kind === "knowledge"
                ? "knowledge"
                : "work"
          }
          size={15}
        />
        {target.kind === "source"
          ? "Source text"
          : target.kind === "knowledge"
            ? "Practice material"
            : "Prior work"}
        <Icon name="arrow" size={15} />
      </span>
      <strong>{evidence.title}</strong>
      <blockquote>“{evidence.quote}”</blockquote>
      <span className="evidence-locator">
        {evidence.locator ||
          `Text characters ${evidence.start}–${evidence.end}`}
        <span>Exact saved version</span>
      </span>
    </a>
  );
}

export function RecordReader({
  route,
  data,
  onChanged,
}: {
  route: Route;
  data: Snapshot;
  onChanged: (message: string) => void;
}): JSX.Element {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [templateEditor, setTemplateEditor] = useState(false);
  const [assignedMatter, setAssignedMatter] = useState("");
  useEffect(() => setAssignedMatter(""), [route.id, route.revision]);
  useEffect(() => {
    const abort = new AbortController();
    setDetail(null);
    setError("");
    setActionError("");
    async function load(): Promise<Detail> {
      if (route.page === "work")
        return {
          kind: "work",
          record: await request<Work>(
            `/work/${route.id}`,
            undefined,
            abort.signal,
          ),
        };
      if (route.page === "references") {
        if (route.revision) {
          const revision = await request<SourceRevision>(
            `/source-revisions/${route.revision}`,
            undefined,
            abort.signal,
          );
          return {
            kind: "references",
            revision,
            record: await request<Source>(
              `/sources/${revision.sourceId}`,
              undefined,
              abort.signal,
            ),
          };
        }
        const record = await request<Source>(
          `/sources/${route.id}`,
          undefined,
          abort.signal,
        );
        return { kind: "references", record, revision: record.latest };
      }
      if (route.revision) {
        const revision = await request<KnowledgeRevision>(
          `/knowledge-revisions/${route.revision}`,
          undefined,
          abort.signal,
        );
        return {
          kind: "knowledge",
          revision,
          record: await request<Knowledge>(
            `/knowledge/${revision.knowledgeId}`,
            undefined,
            abort.signal,
          ),
        };
      }
      const record = await request<Knowledge>(
        `/knowledge/${route.id}`,
        undefined,
        abort.signal,
      );
      const baseline = record.importedOriginal && record.latest.number === 1 && record.latest.status === 'pending'
        ? await request<SourceRevision>(`/source-revisions/${record.importedOriginal.revisionId}`, undefined, abort.signal) : undefined;
      return { kind: "knowledge", record, revision: record.latest, baseline };
    }
    load()
      .then((value) => {
        if (!abort.signal.aborted) setDetail(value);
      })
      .catch((e) => {
        if (!abort.signal.aborted) setError((e as Error).message);
      });
    return () => abort.abort();
  }, [route.page, route.id, route.revision, retry]);

  async function review(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || detail?.kind !== "knowledge" || !data.profile) return;
    const action = (
      (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement
    )?.value;
    if (action !== "approve" && action !== "reject") return;
    setBusy(true);
    setActionError("");
    try {
      const record = await request<Knowledge>(
        `/knowledge/${detail.record.id}/review`,
        {
          expectedRevisionId: detail.revision.id,
          action,
          expectedProfileRevisionId: data.profile.revisionId,
        },
      );
      setDetail({ kind: "knowledge", record, revision: record.latest });
      onChanged(
        action === "approve"
          ? "Practice item approved. Your decision is recorded."
          : "Practice item not adopted. Your decision is recorded.",
      );
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function assign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || detail?.kind !== "work" || !assignedMatter) return;
    const matterId = String(new FormData(event.currentTarget).get("matter"));
    setBusy(true);
    setActionError("");
    try {
      const record = await request<Work>(`/work/${detail.record.id}/assign`, {
        matterId,
      });
      setDetail({ kind: "work", record });
      onChanged("Work linked to the matter.");
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (error)
    return (
      <>
        <a className="back-link" href={href(route.page)}>
          <Icon name="back" size={16} />
          Back to{" "}
          {route.page === "knowledge"
            ? "practice"
            : route.page === "references"
              ? "sources"
              : route.page}
        </a>
        <ErrorNotice message={error} retry={() => setRetry((v) => v + 1)} />
      </>
    );
  if (!detail)
    return (
      <div className="loading-state" role="status">
        Opening the saved record…
      </div>
    );
  if ((detail.kind === 'references' || detail.kind === 'work') && detail.record.lifecycle === 'trashed') return <section className="trashed-record">
    <a className="back-link" href={href('trash')}><Icon name="back" size={16} />Back to Trash</a>
    <h1>{detail.kind === 'work' ? detail.record.output?.title ?? detail.record.title : detail.revision.title}</h1>
    <p>This {detail.kind === 'work' ? 'output' : 'document'} is in Trash. Restore it to read, download or use it again.</p>
    <p className="fine-print">Existing conversations, quoted excerpts and applied changes remain. No original file outside this workspace was deleted.</p>
    <RecordActions kind={detail.kind === 'work' ? 'work' : 'source'} id={detail.record.id} trashed changed={() => { onChanged('Record restored.'); setRetry(n => n + 1); }} />
  </section>;
  const shownRevision = detail.kind === 'work' ? null : detail.kind === 'knowledge' ? detail.baseline ?? detail.revision : detail.revision;
  const title =
    detail.kind === "work"
      ? (detail.record.output?.title ?? detail.record.title)
      : shownRevision!.title;
  const body =
    detail.kind === "work" ? detail.record.answer : detail.kind === 'knowledge' && detail.baseline ? detail.baseline.body : detail.revision.body;
  const recordedAt =
    detail.kind === "work"
      ? detail.record.recordedAt
      : shownRevision!.receivedAt;
  const status =
    detail.kind === "work"
      ? detail.record.disposition
      : detail.kind === "references"
        ? detail.revision.textStatus
        : detail.revision.status;
  const matterIds =
    detail.kind === "references"
      ? detail.record.matterIds
      : detail.record.matterId
        ? [detail.record.matterId]
        : [];
  const previous =
    detail.kind !== "work" && detail.revision.id !== detail.record.latest.id;
  const practiceFile =
    detail.kind === "references" &&
    detail.record.placement?.collection === "practice";
  const matterFile =
    detail.kind === "references" &&
    detail.record.placement?.collection === "matter" &&
    matterIds.length === 1;
  return (
    <>
      <a
        className="back-link"
        href={
          practiceFile
            ? href("knowledge", { section: "materials" })
            : matterFile
              ? href("matters", { id: matterIds[0]! })
              : href(route.page)
        }
      >
        <Icon name="back" size={16} />
        {route.page === "work"
          ? "Saved outputs & notes"
          : route.page === "knowledge"
            ? "All practice"
            : route.page === "references"
              ? practiceFile
                ? "All practice"
                : matterFile
                  ? "Back to matter"
                  : "All sources"
              : `All ${route.page}`}
      </a>
      <div className="reader-heading">
        <div className="reader-labels">
          <Badge tone="blue">
            {detail.kind === "work"
              ? detail.record.output
                ? kindLabel(detail.record.output.kind)
                : detail.record.origin
                  ? "Conversation history"
                  : "Saved note / decision"
              : kindLabel(detail.record.kind)}
          </Badge>
          {detail.kind === 'knowledge' && detail.baseline ? <Badge tone="green">{detail.record.kind === 'position' ? 'Imported baseline · in use' : detail.record.kind === 'pattern' ? 'Historical context · not a standard' : detail.record.kind === 'language' ? 'Starting language · in use' : 'Working method · in use'}</Badge> : <Status value={status} />}
          {previous && <Badge tone="amber">Previous version</Badge>}
        </div>
        <h1>{title}</h1>
        <p>
          Saved {fullDate(recordedAt)}
          {detail.kind !== "work" && ` • Version ${shownRevision!.number}`}
        </p>
      </div>
      {detail.kind === "work" && detail.record.origin && (
        <p className="output-origin">
          <Icon name="chat" size={17} />
          <a
            href={href("home", {
              id: detail.record.origin.conversationId,
              turn: detail.record.origin.turnId,
            })}
          >
            Open originating conversation
          </a>
          <span>
            The saved text and its evidence remain linked to the original
            exchange.
          </span>
        </p>
      )}
      {previous && (
        <div className="version-notice">
          You are reading the exact version referenced at the time.
          <a href={href(route.page, { id: detail.record.id })}>
            Open current version
            <Icon name="arrow" size={15} />
          </a>
        </div>
      )}
      <div className="reader-layout">
        <article className="reading-sheet">
          {detail.kind === "work" && !!detail.record.answer.trim() && (
            <WordExport key={detail.record.id} workId={detail.record.id} />
          )}
          {detail.kind === "references" && (
            <ExtractionInfo revision={detail.revision} />
          )}
          {detail.kind === "work" &&
            detail.record.evidence.length > 0 && (
              <SourceChangeNotice workId={detail.record.id} />
            )}
          {detail.kind === 'knowledge' && <SourceChangeNotice knowledgeRevisionId={detail.revision.id} />}
          {detail.kind === "work" && (
            <section className="work-request">
              <h2>Question or context</h2>
              <Prose text={detail.record.request} />
            </section>
          )}
          <section className="reading-body">
            {detail.kind === 'knowledge' && detail.baseline && <p className="fine-print">Reading the imported original currently used in chats. Propose an update to change your practice material; the original stays intact.</p>}
            <h2>
              {detail.kind === "work"
                ? status === "decision"
                  ? "Recorded decision"
                  : "Note / draft"
                : detail.kind === "references"
                  ? "Source text"
                  : "Practice material"}
            </h2>
            {body === null ? (
              <div className="coverage-notice">
                <p>
                  No text has been saved for this source. Its contents are not
                  searchable.
                </p>
              </div>
            ) : (
              <DocumentReader
                key={
                  detail.kind === "work" ? detail.record.id : detail.revision.id
                }
                text={body}
                markdown={
                  detail.kind === "references"
                    ? sourceUsesMarkdown(detail.revision.provenance)
                    : detail.kind === "knowledge"
                      ? practiceUsesMarkdown(body)
                      : true
                }
              />
            )}
          </section>
          {detail.kind === "references" &&
            detail.revision.textStatus === "partial" && (
              <div className="coverage-notice">
                Only part of this source is available. Search and citations
                cannot cover the missing text.
              </div>
            )}
          {detail.kind === "work" && detail.record.decisionBy && (
            <div className="decision-signature">
              <Icon name="check" size={18} />
              <span>
                Decision recorded by <strong>{detail.record.decisionBy}</strong>
              </span>
            </div>
          )}
          {detail.kind === "knowledge" && detail.revision.approvedBy && (
            <div className="decision-signature">
              <Icon name="check" size={18} />
              <span>
                Approved by <strong>{detail.revision.approvedBy}</strong>
                {detail.revision.approvedAt &&
                  ` on ${fullDate(detail.revision.approvedAt)}`}
              </span>
            </div>
          )}
          {detail.kind === 'knowledge' && !!detail.revision.supportingEvidence?.length && <details className="knowledge-support">
            <summary>Supporting passages ({detail.revision.supportingEvidence.length})</summary>
            <p className="fine-print">Recorded basis for this version, not a new verification of current law. Editing or approving the item does not refresh these sources.</p>
            {detail.revision.supportingEvidence.map((evidence, index) => <a className="evidence-card" key={index}
              href={evidence.target.kind === 'work' ? href('work', { id: evidence.target.workId })
                : href(evidence.target.kind === 'source' ? 'references' : 'knowledge', { revision: evidence.target.revisionId })}>
              <strong>{evidence.title ?? 'Supporting record'}</strong><blockquote>“{evidence.quote}”</blockquote>
              <span className="evidence-locator">{evidence.locator ?? `Text characters ${evidence.start}–${evidence.start + evidence.quote.length}`} · Exact saved version</span>
            </a>)}
          </details>}
          {detail.kind === "knowledge" &&
            detail.revision.status === "pending" &&
            !detail.baseline &&
            !previous && (
              <form className="knowledge-review" onSubmit={review}>
                <div>
                  <Icon name="review" size={24} />
                  <h2>Should your practice use this?</h2>
                </div>
                <p>
                  Approval makes this version available in normal search.{" "}
                  {detail.record.importedOriginal
                    ? "Your imported original is already available to chats as practice context. Approval adopts this Practice version in its place; rejecting it withdraws the original from automatic context."
                    : detail.record.active
                      ? "Your earlier approved version remains in use until you approve a replacement."
                      : "Until then, it stays out of normal search."}{" "}
                  Either choice is recorded as your decision.
                </p>
                {detail.record.importedOriginal && (
                  <p>
                    <a
                      href={href("references", {
                        revision: detail.record.importedOriginal.revisionId,
                      })}
                    >
                      Read the imported original used in chats
                    </a>
                  </p>
                )}
                <ProfileAttribution profile={data.profile} />
                {actionError && (
                  <ErrorNotice
                    message={actionError}
                    retry={() => setRetry((v) => v + 1)}
                  />
                )}
                <div className="review-actions">
                  <button
                    className="button button-primary"
                    value="approve"
                    disabled={busy || !data.profile}
                  >
                    <Icon name="check" size={16} />
                    {busy ? "Recording…" : "Approve for practice"}
                  </button>
                  <button
                    className="button"
                    value="reject"
                    disabled={busy || !data.profile}
                  >
                    Do not adopt
                  </button>
                </div>
              </form>
            )}
          {detail.kind === "knowledge" &&
            detail.record.active &&
            detail.record.active.id !== detail.revision.id && (
              <div className="active-version">
                <Icon name="knowledge" size={18} />
                <span>A different approved version is currently in use.</span>
                <a
                  href={href("knowledge", {
                    id: detail.record.id,
                    revision: detail.record.active.id,
                  })}
                >
                  Read it
                </a>
              </div>
            )}
        </article>
        <aside className="reader-aside">
          {detail.kind === 'knowledge' && <PracticeOriginals id={detail.record.id} />}
          {(detail.kind === 'references' || detail.kind === 'work') && <section className="record-management">
            <h2>Manage {detail.kind === 'work' ? 'output' : 'document'}</h2>
            <RecordActions kind={detail.kind === 'work' ? 'work' : 'source'} id={detail.record.id} changed={() => { onChanged('Record moved to Trash. You can restore it there.'); setRetry(n => n + 1); }} />
          </section>}
          {detail.kind === 'references' && <SourceMatters sourceId={detail.record.id} data={data} changed={() => { onChanged('Document matter links updated. Workspace original retained.'); setRetry(n => n + 1); }} />}
          {detail.kind === 'references' && (data.interfaceVersion ?? 0) >= 24 && /\.(md|txt)$/i.test(detail.record.latest.provenance.origin) &&
            <SourceLinks key={detail.record.id} sourceId={detail.record.id} changed={() => onChanged('Document links saved.')} />}
          {detail.kind === "references" && (
            <SourceLocation
              key={detail.record.id}
              source={detail.record}
              changed={() => {
                onChanged(
                  "File location saved. Original and citations unchanged.",
                );
                setRetry((n) => n + 1);
              }}
            />
          )}
          {detail.kind === "references" && detail.revision.body?.trim() && (
            <section className="source-template-action">
              <h2>A starting point for future work?</h2>
              <p className="fine-print">
                Only documents you explicitly choose become practice-wide
                templates.
              </p>
              <button
                className="button"
                onClick={() => setTemplateEditor(true)}
              >
                Save as a template
              </button>
            </section>
          )}
          {detail.kind === "knowledge" && (
            <KnowledgeVersions
              item={detail.record}
              initialBody={detail.baseline?.body ?? undefined}
              viewedRevisionId={detail.revision.id}
              updated={(record) => {
                setDetail({
                  kind: "knowledge",
                  record,
                  revision: record.latest,
                });
                go("knowledge", { id: record.id });
                onChanged(
                  "Practice update saved for review. Approval remains a separate step.",
                );
              }}
            />
          )}
          {detail.kind === "references" && (
            <SourceVersions
              source={detail.record}
              viewedRevisionId={detail.revision.id}
              updated={(record, message) => {
                setDetail({
                  kind: "references",
                  record,
                  revision: record.latest,
                });
                go("references", { id: record.id });
                onChanged(
                  message ?? "Source version saved. Earlier documents and citations are preserved.",
                );
              }}
            />
          )}
          {detail.kind !== 'references' && <section className="record-context">
            <h2>In context</h2>
            {matterIds.length ? (
              matterIds.map((id) => (
                <a
                  className="context-link"
                  key={id}
                  href={href("matters", { id })}
                >
                  <Icon name="matter" size={18} />
                  <span>
                    {data.matters.find((m) => m.id === id)?.title ??
                      "Open linked matter"}
                  </span>
                  <Icon name="chevron" size={14} />
                </a>
              ))
            ) : (
              <p className="aside-empty">
                {detail.kind === "knowledge"
                  ? "Practice-wide material"
                  : "Not linked to a matter"}
              </p>
            )}
            {detail.kind === "work" &&
              detail.record.matterId === null &&
              data.matters.length > 0 && (
                <form className="assignment-form" onSubmit={assign}>
                  <label>
                    Link to a matter
                    <MatterPicker
                      name="matter"
                      label="Link to a matter"
                      value={assignedMatter}
                      onChange={setAssignedMatter}
                      matters={data.matters}
                      disabled={busy}
                    />
                  </label>
                  <button className="button" disabled={busy || !assignedMatter}>
                    {busy ? "Linking…" : "Link work"}
                  </button>
                  {actionError && <ErrorNotice message={actionError} />}
                </form>
              )}
          </section>}
          {detail.kind === "work" ? (
            <section className="evidence-panel">
              <h2>
                References{" "}
                <span className="count">{detail.record.evidence.length}</span>
              </h2>
              <p className="aside-caption">The exact text behind this work.</p>
              {detail.record.evidence.length ? (
                detail.record.evidence.map((e) => (
                  <EvidenceLink key={e.id} evidence={e} />
                ))
              ) : (
                <p className="aside-empty">
                  No evidence links were recorded for this work. This is not a
                  source-verified answer.
                </p>
              )}
            </section>
          ) : (
            <section className="provenance-panel">
              <h2>
                {detail.kind === "references" ? "Provenance" : "Record details"}
              </h2>
              <dl>
                {detail.kind === "references" ? (
                  <>
                    <dt>Source location</dt>
                    <dd>{detail.revision.provenance.origin}</dd>
                    {detail.revision.provenance.publication && <>
                      <dt>Publisher version date</dt>
                      <dd>{detail.revision.provenance.publication.versionDate}</dd>
                      <dt>Publisher current through at retrieval</dt>
                      <dd>{detail.revision.provenance.publication.publisherCurrentThrough}</dd>
                      {detail.revision.provenance.publication.publisher === 'uscode' ? <>
                        <dt>Publisher says laws in effect on</dt><dd>{detail.revision.provenance.publication.lawsInEffectOn}</dd>
                        <dt>Updated through public law</dt><dd>{detail.revision.provenance.publication.currentThroughPublicLaw}</dd>
                        <dd><a href={detail.revision.provenance.publication.url} target="_blank" rel="noopener noreferrer">Open publisher’s latest U.S. Code text</a></dd>
                        <dd>Preliminary Code. The live publisher page can change; this saved version and original remain unchanged. Check statutory notes and pending updates. These dates are not a legal review.</dd>
                      </> : <>
                        <dd><a href={detail.revision.provenance.publication.url} target="_blank" rel="noopener noreferrer">Open dated eCFR text</a></dd>
                        <dd>Government editorial compilation, not the official legal edition. These dates are not a legal review.</dd>
                      </>}
                    </>}
                    {detail.revision.provenance.author && (
                      <>
                        <dt>Author</dt>
                        <dd>{detail.revision.provenance.author}</dd>
                      </>
                    )}
                    {detail.revision.provenance.retrievedAt && (
                      <>
                        <dt>Retrieved</dt>
                        <dd>
                          {fullDate(detail.revision.provenance.retrievedAt)}
                        </dd>
                      </>
                    )}
                    <dt>Format</dt>
                    <dd>
                      {detail.revision.provenance.mediaType ?? "Not specified"}
                    </dd>
                  </>
                ) : (
                  <>
                    <dt>Ownership</dt>
                    <dd>
                      {detail.record.ownership === "user"
                        ? "Your practice"
                        : "Maintained content"}
                    </dd>
                    <dt>Use in chats</dt>
                    <dd>
                      {detail.baseline ? 'Imported practice context · available without another approval' : detail.record.active?.id === detail.revision.id
                        ? "Current approved practice material"
                        : detail.record.importedOriginal ? 'The imported original remains in use; this update needs review' : "This version is not in use"}
                    </dd>
                  </>
                )}
                <dt>Saved version</dt>
                <dd>{shownRevision!.number}</dd>
              </dl>
              <details className="integrity-details">
                <summary>Version identity</summary>
                <p>Revision ID</p>
                <code>{shownRevision!.id}</code>
                <p>Text SHA-256</p>
                <code>{shownRevision!.contentHash ?? "No text saved"}</code>
              </details>
            </section>
          )}
        </aside>
      </div>
      {templateEditor && detail.kind === "references" && (
        <TemplateEditor
          data={data}
          initialSource={{
            revisionId: detail.revision.id,
            title: detail.revision.title,
          }}
          close={() => setTemplateEditor(false)}
          saved={() => {
            setTemplateEditor(false);
            onChanged(
              "Template saved in Practice. Its pinned source version is available to future chats.",
            );
          }}
        />
      )}
    </>
  );
}
