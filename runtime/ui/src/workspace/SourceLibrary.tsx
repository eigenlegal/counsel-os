import { useEffect, useState } from "react";
import type {
  SourceCollection,
  SourceLibraryPage,
  SourcePlacement,
} from "../../../src/workspace/source-library";
import { href, request, type Snapshot, type Source } from "./api";
import { Empty, ErrorNotice, PageHeader, Status } from "./components";
import { Icon } from "./icons";
import { WorkingGuideLibrary } from "./WorkingGuideLibrary";
import type { EditorState } from "./Editor";
import { SourceOrganization } from './SourceOrganization';
import { WorkspaceUpkeep } from './WorkspaceUpkeep';

export function SourceShelf({
  collection,
  data,
}: {
  collection: SourceCollection;
  data: Snapshot;
}) {
  const [query, setQuery] = useState(""),
    [page, setPage] = useState(0),
    [value, setValue] = useState<SourceLibraryPage | null>(null);
  const [error, setError] = useState(""),
    [retry, setRetry] = useState(0);
  const [selected, setSelected] = useState<string[]>([]), [organize, setOrganize] = useState<'manual' | 'suggest' | null>(null);
  const [notice, setNotice] = useState('');
  const canOrganize = collection === 'unfiled' && (data.interfaceVersion ?? 0) >= 18;
  const pageSelection = [...new Set([...selected, ...(value?.records.map(file => file.id) ?? [])])];
  useEffect(() => {
    const abort = new AbortController();
    setValue(null);
    setError("");
    const timer = setTimeout(
      () =>
        request<SourceLibraryPage>(
          `/source-library?collection=${collection}&q=${encodeURIComponent(query)}&page=${page}`,
          undefined,
          abort.signal,
        )
          .then((v) => {
            if (!abort.signal.aborted) setValue(v);
          })
          .catch((e) => {
            if (!abort.signal.aborted) setError(e.message);
          }),
      150,
    );
    return () => {
      abort.abort();
      clearTimeout(timer);
    };
  }, [collection, query, page, retry, data.totals.sources]);
  return (
    <section
      aria-label={collection === "practice" ? "Practice files" : "Source files"}
    >
      <div className="collection-toolbar">
        <span className="result-count">
          {value ? `${value.total} ${value.total === 1 ? 'file' : 'files'}` : "Files"}
        </span>
        <label className="filter-input">
          <Icon name="search" size={17} />
          <input
            aria-label="Find files by title"
            placeholder="Find by title…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
          />
        </label>
      </div>
      {canOrganize && value && value.records.length > 0 && <div className="source-selection-toolbar">
        <span>{selected.length} selected</span>
        <button className="text-button" disabled={pageSelection.length > 100} onClick={() => setSelected(pageSelection)}>Select this page</button>
        <button className="text-button" disabled={!selected.length} onClick={() => setSelected([])}>Clear</button>
        <button className="button" disabled={!selected.length} onClick={() => setOrganize('manual')}>Organize selected…</button>
        <button className="button" disabled={!selected.length || selected.length > 20} onClick={() => setOrganize('suggest')}>Suggest filing…</button>
        <small>Up to 100 files per action · 20 with AI help</small>
      </div>}
      {notice && <p role="status" className="field-help">{notice}</p>}
      {error ? (
        <ErrorNotice message={error} retry={() => setRetry((n) => n + 1)} />
      ) : !value ? (
        <p role="status">Loading files…</p>
      ) : !value.records.length ? (
        <Empty title={query ? "No matching files" : "No files here yet"}>
          {collection === "unfiled"
            ? "Files whose purpose is unclear appear here for you to organize. Nothing is assumed to be external material."
            : "Originals remain available wherever they are linked or cited."}
        </Empty>
      ) : (
        <div className="resource-list">
          {value.records.map((file) => (
            <div key={file.id} className={canOrganize ? 'source-selectable-row' : undefined}>
              {canOrganize && <input type="checkbox" aria-label={`Select ${file.title}`} checked={selected.includes(file.id)}
                disabled={selected.length >= 100 && !selected.includes(file.id)} onChange={event => setSelected(values => event.target.checked ? [...values, file.id] : values.filter(id => id !== file.id))} />}
            <a
              className="resource-row"
              key={file.id}
              href={href("references", { id: file.id })}
            >
              <span className="resource-icon">
                <Icon name="reference" size={24} />
              </span>
              <span className="resource-copy">
                <span className="resource-title">
                  <strong>{file.title}</strong>
                  <Status value={file.textStatus} />
                </span>
                <p>
                  {file.preview ||
                    "Original retained; readable text is not available."}
                </p>
                <span className="resource-meta">
                  {collection === "practice"
                    ? "Your practice · original material, not approval"
                    : collection === "external"
                      ? "External material · not automatically verified"
                      : "Needs organizing"}
                  {file.matterIds.length > 0 && (
                    <span>
                      Also linked to {file.matterIds.length}{" "}
                      {file.matterIds.length === 1 ? "matter" : "matters"}
                    </span>
                  )}
                </span>
              </span>
              <Icon name="chevron" size={17} />
            </a>
            </div>
          ))}
        </div>
      )}
      {value && (page > 0 || value.hasMore) && (
        <div className="library-pagination">
          <button
            className="button"
            disabled={!page}
            onClick={() => setPage((n) => n - 1)}
          >
            Previous
          </button>
          <span>
            Page {page + 1} of {Math.max(1, Math.ceil(value.total / 50))}
          </span>
          <button
            className="button"
            disabled={!value.hasMore}
            onClick={() => setPage((n) => n + 1)}
          >
            Next
          </button>
        </div>
      )}
      {organize && <SourceOrganization sourceIds={selected} mode={organize} data={data} close={() => setOrganize(null)}
        saved={() => { setSelected([]); setPage(0); setRetry(n => n + 1); setNotice('Selected files organized. Originals and approvals are unchanged. You can adjust a file’s location or matter links in its reader.'); }} />}
    </section>
  );
}

export function SourcesLibrary({
  data,
  openEditor,
}: {
  data: Snapshot;
  openEditor: (value: EditorState) => void;
}) {
  const [section, setSection] = useState("external");
  return (
    <>
      <PageHeader
        title="Sources"
        description="External reference material: law, research, commentary, and Counsel’s working guides. Your own methods and materials live in Practice; case-specific documents live with their matter."
        action={
          section === "external" ? (
            <button
              className="button button-primary"
              onClick={() =>
                openEditor({ kind: "reference", collection: "external" })
              }
            >
              <Icon name="plus" size={17} />
              Add a source
            </button>
          ) : undefined
        }
      />
      <div
        className="practice-sections"
        role="group"
        aria-label="Sources section"
      >
        {[
          ["external", "External references"],
          ["guides", "Counsel guides"],
          ["unfiled", "Needs organizing"],
        ].map(([id, title]) => (
          <button
            key={id}
            aria-pressed={section === id}
            onClick={() => setSection(id!)}
          >
            {title}
          </button>
        ))}
      </div>
      {section === "guides" ? (
        <WorkingGuideLibrary />
      ) : (
        <>
          {section === "unfiled" && (
            <p className="field-help">
              Unclassified uploads and import receipts. Open a file to place it
              in Practice or Sources, or link it to a matter. Linking explicitly makes
              the document available to chats in that matter; it never approves content.
            </p>
          )}
          {section === 'unfiled' && (data.interfaceVersion ?? 0) >= 23 && <WorkspaceUpkeep data={data} />}
          <SourceShelf
            key={section}
            collection={section as SourceCollection}
            data={data}
          />
        </>
      )}
    </>
  );
}

export function SourceLocation({
  source,
  changed,
}: {
  source: Source;
  changed: () => void;
}) {
  const [placement, setPlacement] = useState<SourcePlacement | undefined>(
      source.placement,
    ),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [choice, setChoice] = useState(
    source.placement?.collection === "external" ||
      source.placement?.collection === "practice"
      ? source.placement.collection
      : "auto",
  );
  return (
    <section className="source-location">
      <h2>Library location</h2>
      <p className="fine-print">
        Organization only. Your original, citations, matter links and chat
        permissions stay unchanged. Practice files are not automatically
        approved positions.
      </p>
      <label>
        Show in
        <select
          aria-label="Library location"
          value={choice}
          disabled={busy}
          onChange={(e) => setChoice(e.target.value)}
        >
          <option value="external">Sources · external reference</option>
          <option value="practice">Practice · your material</option>
          <option value="auto">Linked matters, or Needs organizing</option>
        </select>
      </label>
      <button
        className="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            setPlacement(
              await request(`/sources/${source.id}/placement`, {
                collection: choice,
                expectedRevisionId: placement?.revisionId ?? null,
              }),
            );
            changed();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Saving…" : "Save location"}
      </button>
      {error && (
        <p role="alert" className="field-error">
          {error}
        </p>
      )}
    </section>
  );
}
