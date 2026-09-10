import { useEffect, useState, type FormEvent } from "react";
import { go, href, request, type PracticeTemplate, type Snapshot, type SourceRevision } from "./api";
import { DocumentReader, sourceUsesMarkdown } from './DocumentReader';
import { Badge, Empty, ErrorNotice, fullDate, Modal } from "./components";
import { DocumentUpload } from "./DocumentUpload";
import { Icon } from "./icons";

export function TemplateEditor({
  data,
  item,
  initialSource,
  close,
  saved,
}: {
  data: Snapshot;
  item?: PracticeTemplate;
  initialSource?: { revisionId: string; title: string };
  close: () => void;
  saved: () => void;
}): JSX.Element {
  const [source, setSource] = useState(
    item?.sourceRevisionId ?? initialSource?.revisionId ?? "",
  );
  const [title, setTitle] = useState(item?.title ?? initialSource?.title ?? "");
  const [purpose, setPurpose] = useState(item?.whenToUse ?? "");
  const [jurisdiction, setJurisdiction] = useState(item?.jurisdiction ?? "");
  const [available, setAvailable] = useState(item?.available ?? true);
  const [sharing, setSharing] = useState(false);
  const [clientId] = useState(() => crypto.randomUUID());
  const [busy, setBusy] = useState(false),
    [uploading, setUploading] = useState(false);
  const [error, setError] = useState(""),
    [dirty, setDirty] = useState(false);
  const [extraSource, setExtraSource] = useState(initialSource);
  const dismiss = () => {
    if (
      !busy &&
      !uploading &&
      (!dirty || confirm("Discard these unsaved template edits?"))
    )
      close();
  };
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy || uploading || !sharing) return;
    setBusy(true);
    setError("");
    try {
      await request(item ? `/templates/${item.id}/revisions` : "/templates", {
        sourceRevisionId: source,
        title,
        whenToUse: purpose,
        jurisdiction,
        available,
        practiceWideUse: true,
        ...(item ? { baseRevisionId: item.revisionId } : { clientId }),
      });
      saved();
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={item ? "Edit template" : "Add a practice template"}
      onClose={dismiss}
      busy={busy || uploading}
    >
      <form
        className="record-form"
        onSubmit={submit}
        onChange={() => setDirty(true)}
      >
        <p className="form-intro">
          A reusable starting point for an agreement, memo, policy, notice, or
          other work. The original stays intact; this pins one source version.
        </p>
        {!item && !initialSource && (
          <DocumentUpload
            disabled={busy}
            busyChanged={setUploading}
            imported={(document) => {
              setSource(document.latest.id);
              setTitle(document.latest.title);
              setDirty(true);
              setExtraSource({
                revisionId: document.latest.id,
                title: document.latest.title,
              });
            }}
          />
        )}
        <label>
          Document version
          <select
            aria-label="Template document version"
            value={source}
            required
            disabled={busy || uploading}
            onChange={(event) => {
              setSource(event.target.value);
              if (!title)
                setTitle(
                  data.sources.find(
                    (candidate) => candidate.revisionId === event.target.value,
                  )?.title ?? "",
                );
            }}
          >
            <option value="">Choose a saved source</option>
            {source &&
              !data.sources.some(
                (candidate) => candidate.revisionId === source,
              ) && (
                <option value={source}>
                  {extraSource?.title ?? item?.title ?? "Selected source"} ·
                  pinned version
                </option>
              )}
            {data.sources
              .filter((candidate) => candidate.textStatus !== "unavailable")
              .map((candidate) => (
                <option key={candidate.revisionId} value={candidate.revisionId}>
                  {candidate.title} · current source version
                </option>
              ))}
          </select>
        </label>
        {source && (
          <a
            className="text-button"
            href={href("references", { revision: source })}
            target="_blank"
            rel="noopener noreferrer"
          >
            Inspect this source version ↗
          </a>
        )}
        <label>
          Template name
          <input
            aria-label="Template name"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
            maxLength={300}
            disabled={busy}
          />
        </label>
        <label>
          When to use it
          <textarea
            aria-label="When to use it"
            value={purpose}
            onChange={(event) => setPurpose(event.target.value)}
            required
            maxLength={2000}
            rows={3}
            placeholder="What this is a starting point for, and any limits on its use."
            disabled={busy}
          />
        </label>
        <label>
          Jurisdiction or applicability
          <input
            aria-label="Template jurisdiction"
            value={jurisdiction}
            onChange={(event) => setJurisdiction(event.target.value)}
            maxLength={500}
            placeholder="Optional—confirm applicability for each matter"
            disabled={busy}
          />
        </label>
        {item && (
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={available}
              onChange={(event) => setAvailable(event.target.checked)}
              disabled={busy}
            />
            Available for future work
          </label>
        )}
        <label className="checkbox-label template-sharing">
          <input
            type="checkbox"
            checked={sharing}
            onChange={(event) => setSharing(event.target.checked)}
            required
            disabled={busy}
          />
          <span>
            {available
              ? "Make this exact source version available to chats across my practice, including outside its original matter."
              : "Retire this template from future chats. Keep its prior versions and existing citations."}
          </span>
        </label>
        <p className="fine-print">
          Check for confidential matter-specific content before sharing across
          your practice. Templates guide drafting; they do not become approved
          positions or legal authority. Uploads remain in Sources even if you
          cancel this form.
        </p>
        {error && <ErrorNotice message={error} />}
        <div className="dialog-actions">
          <button
            type="button"
            className="button"
            onClick={dismiss}
            disabled={busy || uploading}
          >
            Cancel
          </button>
          <button
            className="button button-primary"
            disabled={busy || uploading || !sharing || !source}
          >
            {busy ? "Saving…" : "Save template"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function TemplateHistory({ item }: { item: PracticeTemplate }): JSX.Element {
  const [history, setHistory] = useState<PracticeTemplate[]>([]),
    [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const abort = new AbortController();
    request<PracticeTemplate[]>(
      `/templates/${item.id}/history`,
      undefined,
      abort.signal,
    )
      .then((value) => {
        if (!abort.signal.aborted) {
          setHistory(value);
          setError("");
        }
      })
      .catch((error) => {
        if (!abort.signal.aborted) setError((error as Error).message);
      });
    return () => abort.abort();
  }, [open, item.id, item.revisionId]);
  return (
    <details
      className="template-history"
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary>Version history</summary>
      {history.map((version) => (
        <div key={version.revisionId}>
          <a href={href("references", { revision: version.sourceRevisionId })}>
            Version {version.number} · {version.title}
          </a>
          <span>
            {version.available ? "Available" : "Retired"} ·{" "}
            {fullDate(version.recordedAt)}
          </span>
          <p>
            {version.whenToUse}
            {version.jurisdiction && ` · ${version.jurisdiction}`}
          </p>
        </div>
      ))}
      {history.length === 50 && (
        <p>
          Showing the latest 50 template versions. Earlier source versions
          remain accessible through saved citations.
        </p>
      )}
      {error && <ErrorNotice message={error} />}
    </details>
  );
}

export function TemplateDetail({ item, data, changed }: { item: PracticeTemplate; data: Snapshot; changed: () => void }) {
  const [editing, setEditing] = useState(false), [source, setSource] = useState<SourceRevision | null>(null), [error, setError] = useState('');
  useEffect(() => {
    const abort = new AbortController(); setSource(null); setError('');
    request<SourceRevision>(`/source-revisions/${item.sourceRevisionId}`, undefined, abort.signal).then(v => { if (!abort.signal.aborted) setSource(v); }).catch(e => { if (!abort.signal.aborted) setError(e.message); });
    return () => abort.abort();
  }, [item.sourceRevisionId]);
  return <section className="practice-template-detail" aria-label="Practice template">
    <a className="back-link" href={href('knowledge', { category: 'template' })}><Icon name="back" size={16} />All templates</a>
    <div className="reader-heading"><h1>{item.title}</h1><p>{item.whenToUse}</p><Badge tone={item.available ? 'blue' : 'neutral'}>{item.available ? 'Starting document' : 'Not in use'}</Badge></div>
    <div className="reader-layout"><article className="reading-sheet">{error ? <ErrorNotice message={error} /> : source ? <DocumentReader text={source.body ?? 'No readable text is available.'} markdown={sourceUsesMarkdown(source.provenance)} /> : <p role="status">Loading document…</p>}</article>
      <aside className="reader-aside"><section><h2>Use this template</h2><p className="fine-print">A starting document, not a standing position. Confirm the parties, dates, and applicability for each matter.</p>
        <div className="source-version-actions"><button className="button button-primary" disabled={!item.available} onClick={() => go('home', { new: crypto.randomUUID(), template: item.id })}>Start a draft</button><button className="button" onClick={() => setEditing(true)}>Edit template</button></div>
        {item.jurisdiction && <p>{item.jurisdiction}</p>}</section>
        <section><h2>Original &amp; versions</h2><a href={href('references', { revision: item.sourceRevisionId })}>Open pinned original</a><TemplateHistory item={item} /></section>
      </aside></div>
    {editing && <TemplateEditor item={item} data={data} close={() => setEditing(false)} saved={() => { setEditing(false); changed(); }} />}
  </section>;
}

export function Templates({
  data,
  changed,
}: {
  data: Snapshot;
  changed: () => void;
}): JSX.Element {
  const [editing, setEditing] = useState<PracticeTemplate | "new" | null>(null);
  const [query, setQuery] = useState("");
  const items = (data.templates ?? []).filter((item) =>
    `${item.title} ${item.whenToUse} ${item.jurisdiction}`
      .toLocaleLowerCase()
      .includes(query.toLocaleLowerCase()),
  );
  return (
    <section className="templates-collection" aria-label="Practice templates">
      <div className="templates-heading">
        <p>
          Starting documents you choose to reuse. Versioned, traceable, and
          available through chat.
        </p>
        <button
          className="button button-primary"
          onClick={() => setEditing("new")}
        >
          <Icon name="plus" size={17} />
          Add a template
        </button>
      </div>
      <label className="filter-input">
        <Icon name="search" size={17} />
        <input
          aria-label="Filter templates"
          value={query}
          placeholder="Find a starting point…"
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      {!items.length ? (
        <Empty
          title={
            query ? "No matching templates" : "Your starting points belong here"
          }
          icon="reference"
        >
          Add an agreement, memo, policy, investigation plan, or any other
          source you want to reuse. Importing a document alone does not make it
          a template.
        </Empty>
      ) : (
        <div className="template-list">
          {items.map((item) => (
            <article className="template-card" key={item.id}>
              <div className="template-card-heading">
                <Icon name="reference" size={22} />
                <h2>{item.title}</h2>
                <Badge tone={item.available ? "blue" : "neutral"}>
                  {item.available ? "Template" : "Retired"}
                </Badge>
              </div>
              <p>{item.whenToUse}</p>
              <p className="template-meta">
                Version {item.number}
                {item.jurisdiction && ` · ${item.jurisdiction}`}
              </p>
              <div className="template-actions">
                <button
                  className="button button-primary"
                  disabled={!item.available}
                  onClick={() =>
                    go("home", { new: crypto.randomUUID(), template: item.id })
                  }
                >
                  Start a draft
                  <Icon name="arrow" size={15} />
                </button>
                <a
                  className="button"
                  href={href("references", { revision: item.sourceRevisionId })}
                >
                  View source
                </a>
                <button
                  className="text-button"
                  onClick={() => setEditing(item)}
                >
                  Edit template
                </button>
              </div>
              <TemplateHistory item={item} />
            </article>
          ))}
        </div>
      )}
      {editing && (
        <TemplateEditor
          data={data}
          item={editing === "new" ? undefined : editing}
          close={() => setEditing(null)}
          saved={() => {
            setEditing(null);
            changed();
          }}
        />
      )}
    </section>
  );
}
