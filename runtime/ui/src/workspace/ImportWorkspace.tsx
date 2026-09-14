import { useEffect, useRef, useState } from "react";
import { go, href, request, type Snapshot, type ProfileFields } from "./api";
import { ImportProfileFields } from './ImportProfileFields';
import type { ImportProfileMapping } from '../../../src/workspace/import-profile';
import { ImportPreferenceFields } from './ImportPreferenceFields';
import { IMPORT_WORKING_FIELDS, type ImportPreferenceMapping, type ImportPreferenceReview } from '../../../src/workspace/import-preferences';
import type { WorkingPreferences } from '../../../src/workspace/working-preferences';
import {
  type ImportBatch,
  type ImportEntry,
  type ImportChoice,
  type ImportListItem,
} from "../../../src/workspace/import-types";
import { Badge, ErrorNotice, Modal, PageHeader } from "./components";
import { Icon } from "./icons";
import { DocumentReader } from "./DocumentReader";
import { MatterPicker } from './MatterPicker';
import { ImportOrganization } from './ImportOrganization';
import { ImportFilingPreview } from './ImportFilingPreview';
import { ImportMaintenance } from './ImportMaintenance';
import { ImportBackgroundOrganization, organizationRequest, type ImportOrganizationState } from './ImportBackgroundOrganization';
import { ImportLinks } from './ImportLinks';
import { PracticeSources } from './PracticeSources';
import { practiceIntakeHint } from '../../../src/workspace/practice-intake-hints';
import { useImportUploads, startImportUpload, pauseImportUpload, forgetImportUpload } from './import-uploads';
import {
  droppedFiles,
  selectedFiles,
  type SelectedImportFile,
} from "./import-files";

const destinations: Record<ImportChoice["destination"], string> = {
  source: "Source",
  position: "Practice · Position",
  method: "Practice · Method",
  language: "Practice · Language",
  pattern: "Practice · Lesson",
  template: "Practice · Template",
  profile: "Practice instructions source",
  skip: "Skip this file",
};
export function ImportWorkspace({
  id,
  data,
  onChanged,
}: {
  id?: string;
  data: Snapshot;
  onChanged: () => void;
}): JSX.Element {
  const modernPractice = (data.interfaceVersion ?? 0) >= 33;
  const [practiceSources, setPracticeSources] = useState(false);
  const [imports, setImports] = useState<ImportListItem[]>([]);
  const [batch, setBatch] = useState<ImportBatch | null>(null);
  const [syncError, setSyncError] = useState('');
  const [useAI, setUseAI] = useState(true);
  const [showFiles, setShowFiles] = useState(false);
  const [organizationState, setOrganizationState] = useState<ImportOrganizationState>((data.interfaceVersion ?? 0) >= 21 ? 'checking' : 'none');
  const organizing = ['running', 'checking', 'unavailable'].includes(organizationState);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [organize, setOrganize] = useState<{ mode: 'bulk' | 'suggest'; revisionId: string; entryIds: string[] } | null>(null);
  const [maintenance, setMaintenance] = useState<'duplicates' | 'undo' | null>(null);
  const queryString = new URLSearchParams({ query, status: filter, offset: String(offset), limit: '50' }).toString();
  const sequence = useRef(0);
  const fileTools = useRef<HTMLDivElement>(null);
  const pageNavigation = useRef<number | null>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [dragging, setDragging] = useState(false),
    [entry, setEntry] = useState<ImportEntry | null>(null);
  const [applyProfile, setApplyProfile] = useState(true);
  const [applyPreferences, setApplyPreferences] = useState(false);
  const [confirm, setConfirm] = useState(false),
    [discard, setDiscard] = useState(false),
    [shareTemplates, setShareTemplates] = useState(false);
  const alive = useRef(true);
  const reviewing = useRef(false);
  reviewing.current = !!entry || confirm || discard || !!organize || !!maintenance;
  const uploads = useImportUploads();
  const upload = uploads.find(item => item.batchId === batch?.id);
  const uploading = upload?.state === 'uploading';
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  async function refresh(quiet = false) {
    if (quiet && reviewing.current) return;
    const current = ++sequence.current;
    if (!quiet) setError("");
    try {
      const list = await request<ImportListItem[]>("/imports");
      if (alive.current && current === sequence.current) setImports(list);
      if (id) {
        const next = await request<ImportBatch>(`/imports/${id}?${queryString}`);
        if (alive.current && current === sequence.current && (!quiet || !reviewing.current)) setBatch(next);
      }
      if (alive.current && current === sequence.current) setSyncError('');
    } catch (e) {
      if (alive.current && current === sequence.current && !quiet) setError((e as Error).message);
      if (alive.current && current === sequence.current && quiet) setSyncError('Cannot refresh import progress. Showing the last known state; reconnecting automatically.');
    }
  }
  useEffect(() => {
    setBatch(null);
    setShowFiles(false);
    setApplyProfile(true);
    setApplyPreferences(false);
    setQuery('');
    setFilter('all');
    setOffset(0);
    setShareTemplates(false);
    setSelected([]); setOrganize(null);
  }, [id]);
  useEffect(() => {
    void refresh();
    let timer: ReturnType<typeof setTimeout>;
    let disposed = false;
    const poll = async () => {
      await refresh(true);
      if (!disposed) timer = setTimeout(poll, 1000);
    };
    timer = setTimeout(poll, 1000);
    return () => { disposed = true; clearTimeout(timer); sequence.current++; };
  }, [id, queryString]);
  useEffect(() => {
    if (pageNavigation.current === null || batch?.offset !== pageNavigation.current) return;
    pageNavigation.current = null;
    fileTools.current?.focus({ preventScroll: true });
    fileTools.current?.scrollIntoView({ block: 'start' });
  }, [batch?.offset]);
  function changePage(next: number) {
    pageNavigation.current = next;
    setOffset(next);
  }
  async function select(selected: SelectedImportFile[]) {
    if (busy || uploading) return;
    setBusy(true);
    setError("");
    try {
      let next = batch;
      if (!next) {
        next = await request<ImportBatch>("/imports", {
          clientId: crypto.randomUUID(),
          label: selected[0]!.path.includes("/")
            ? selected[0]!.path.split("/")[0]
            : `${selected.length} selected files`,
          files: selected.map((item) => ({
            path: item.path,
            byteCount: item.file.size,
          })),
        });
        if (alive.current) setBatch(next);
        if (useAI && data.connection.ready && (data.interfaceVersion ?? 0) >= 21) {
          try { await request(`/imports/${next.id}/organization`, organizationRequest(next, data)); }
          catch (e) { if (alive.current) setError(`Files will still upload. AI organization did not start: ${(e as Error).message}`); }
        }
      }
      if (next.progress.paused)
        next = await request<ImportBatch>(`/imports/${next.id}/queue`, { action: 'resume' });
      await startImportUpload(next, selected);
      if (alive.current && !id) go("imports", { id: next.id });
    } catch (e) {
      if (alive.current) setError((e as Error).message);
    } finally {
      if (alive.current) {
        setBusy(false);
        void request<ImportListItem[]>("/imports")
          .then(setImports)
          .catch(() => {});
      }
    }
  }
  const active = batch?.status === "review";
  const included = batch?.selection.included ?? 0;
  const ready = batch?.progress.ready ?? 0;
  const templates = batch?.selection.templates ?? 0;
  const profiles = batch?.selection.profiles ?? 0;
  const profile = batch?.selection.profile ?? null;
  const needsFiles = included !== ready;
  const waitingForUpload = (batch?.progress.awaitingUpload ?? 0) > 0;
  const canPause = !!batch && (uploading || batch.progress.queued + batch.progress.processing > 0 || batch.progress.paused || upload?.state === 'paused' || upload?.state === 'error');
  const importStage = !active || confirm ? 3 : needsFiles || uploading ? 0 : organizing ? 1 : 2;
  const progressText = batch ? [
    `${batch.progress.ready} ready`,
    batch.progress.awaitingUpload && `${batch.progress.awaitingUpload} awaiting upload`,
    batch.progress.queued && `${batch.progress.queued} queued`,
    batch.progress.processing && `${batch.progress.processing} processing`,
    batch.progress.errors && `${batch.progress.errors} need attention`,
  ].filter(Boolean).join(' · ') : '';
  async function queueAction(action: 'pause' | 'resume' | 'retry') {
    if (!batch) return;
    setBusy(true);
    setError('');
    try {
      if (action === 'pause') await pauseImportUpload(batch.id);
      const next = await request<ImportBatch>(`/imports/${batch.id}/queue`, { action });
      setBatch(next);
      if (action !== 'pause') await startImportUpload(next);
      void refresh();
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  const dropzone = (
    <div
      className={`import-dropzone ${batch ? 'import-resume' : ''} ${dragging ? "dragging" : ""}`}
      aria-busy={busy}
      onDragOver={(event) => {
        event.preventDefault();
        if (!busy) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        if (!busy)
          void droppedFiles(event.dataTransfer)
            .then(select)
            .catch((e) => setError(e.message));
      }}
    >
      {!batch && <span className="import-drop-icon">
        <Icon name="attach" size={26} />
      </span>}
      <h2>
        {batch ? "Resume your file selection" : "Bring your practice with you."}
      </h2>
      <p>
        {batch
          ? "Choose the same folder or files to upload anything still missing. Files already staged are kept."
          : "Drop folders and files here. Review the organization before anything enters your workspace."}
      </p>
      <div className="import-file-buttons">
        <label className="button">
          <input
            className="import-file-input"
            type="file"
            multiple
            disabled={busy}
            aria-label="Choose import files"
            onChange={(event) => {
              const list = Array.from(event.target.files ?? []);
              event.target.value = "";
              if (list.length) {
                try {
                  void select(selectedFiles(list));
                } catch (e) {
                  setError((e as Error).message);
                }
              }
            }}
          />
          Choose files
        </label>
        <label className="button button-primary">
          <input
            ref={(element) => element?.setAttribute("webkitdirectory", "")}
            className="import-file-input"
            type="file"
            multiple
            disabled={busy}
            aria-label="Choose import folder"
            onChange={(event) => {
              const list = Array.from(event.target.files ?? []);
              event.target.value = "";
              if (list.length) {
                try {
                  void select(selectedFiles(list));
                } catch (e) {
                  setError((e as Error).message);
                }
              }
            }}
          />
          Choose folder
        </label>
      </div>
      {!batch && (data.interfaceVersion ?? 0) >= 21 && <div className="import-ai-option">
        <label className="import-ai-toggle"><input type="checkbox" aria-describedby="import-ai-description" checked={useAI && data.connection.ready} disabled={!data.connection.ready || busy}
          onChange={e => setUseAI(e.target.checked)} /><span>Let Counsel OS organize my files after upload</span></label>
        <p id="import-ai-description" className="fine-print">{data.connection.ready ? `Uses ${data.connection.label}${data.connection.config ? ` · ${data.connection.config.model}` : ''} and your plan usage. Reads bounded text excerpts, filenames and matching matter names in background batches. Large imports can use substantial AI capacity. Review the suggestions before importing.` : 'Connect AI in Settings to get organization help. You can import and file documents manually now.'}</p>
      </div>}
      <small>
        PDF · Word .docx · TXT · Markdown · up to 10,000 files and 1 GB staged
      </small>
    </div>
  );
  return (
    <>
      <PageHeader
        title="Import your workspace"
        description="Start with what you already know. Organize it here, then make it your own."
        action={
          <button
            className="button"
            disabled={busy}
            onClick={() => void refresh()}
          >
            Reload imports
          </button>
        }
      />
      {error && <ErrorNotice message={error} />}
      {syncError && <ErrorNotice message={syncError} />}
      {!batch && dropzone}
      {busy && !batch && <p role="status">Preparing your selection…</p>}
      {!batch && (
        <div className="import-principles">
          <section>
            <Icon name="shield" />
            <h3>Local until you use it</h3>
            <p>
              Uploading and extraction are local. When organization help is enabled, selected file excerpts are analyzed using your chosen AI connection. Staged files are kept in SQLite,
              outside chat and search, and included in workspace backups.
            </p>
          </section>
          <section>
            <Icon name="matter" />
            <h3>Suggestions, not decisions</h3>
            <p>
              Content and folder hints suggest where files belong. Review
              the organization before importing. No approvals, deadlines or matter status are
              inferred.
            </p>
          </section>
          <section>
            <Icon name="read" />
            <h3>Keep the original</h3>
            <p>
              Imported bytes remain downloadable. Linked outside files are not
              fetched. OCR and legacy .doc conversion are not included.
            </p>
          </section>
        </div>
      )}
      {batch && (
        <section className="import-review">
          <div className="section-heading">
            <div>
              <span className="panel-eyebrow">
                {batch.status === "review"
                  ? "Preparing your import"
                  : batch.status === "committed"
                    ? "Import receipt"
                    : "Discarded import"}
              </span>
              <h2>{batch.label}</h2>
            </div>
            <Badge tone={batch.status === "committed" ? "green" : "blue"}>
              {batch.status === "review"
                ? `${ready} / ${included} files prepared`
                : batch.status}
            </Badge>
          </div>
          {active && <ol className="import-stages" aria-label="Import progress">
            {['Upload', 'Organize', 'Review', 'Import'].map((label, index) => <li key={label} aria-current={index === importStage ? 'step' : undefined} className={index < importStage ? 'complete' : ''}>
              <span aria-hidden="true">{index < importStage ? <Icon name="check" size={14} /> : index + 1}</span>{label}
            </li>)}
          </ol>}
          {active && (needsFiles || uploading || batch.progress.paused || !!batch.progress.errors || organizationState === 'none') && (
            <div className="import-queue-status">
              <div role="status" aria-live="polite">
                <strong>{batch.progress.paused ? 'Import paused' : uploading ? 'Uploading from this browser' : batch.progress.queued + batch.progress.processing > 0 ? 'Processing locally' : waitingForUpload ? 'Waiting for files' : batch.progress.errors ? 'Some files need attention' : organizing ? 'Files uploaded — not imported yet' : 'Ready for your review'}</strong>
                <p>{batch.progress.paused
                  ? 'Uploaded copies are kept. The current file may finish; the remaining files wait until you resume.'
                  : uploading
                  ? `${upload.uploaded} of ${upload.total} files uploaded. You can use other pages in Counsel OS; keep this browser tab open until uploading finishes.`
                  : batch.progress.queued + batch.progress.processing > 0
                    ? 'Uploaded files keep processing while you work elsewhere, even if you close this tab. Processing resumes when the local app restarts.'
                    : waitingForUpload
                      ? 'Choose the original files to finish uploading. Copies already received are kept; no need to upload them again.'
                      : organizing ? 'Your file copies are saved locally. Organization is the next step; follow the progress below.' : 'Nothing enters your workspace until you review and import it.'}</p>
                <span className="fine-print">{progressText}</span>
              </div>
              {(canPause || !!batch.progress.errors) && <div className="import-queue-actions">
                {canPause && <button className="button" disabled={busy} onClick={() => void queueAction(batch.progress.paused || upload?.state === 'paused' || upload?.state === 'error' ? 'resume' : 'pause')}>
                  {batch.progress.paused || upload?.state === 'paused' || upload?.state === 'error' ? 'Resume import' : 'Pause after current file'}
                </button>}
                {!!batch.progress.errors && <button className="button" disabled={busy} onClick={() => void queueAction('retry')}>Retry failed files</button>}
              </div>}
              {upload?.error && <ErrorNotice message={upload.error} />}
              {batch.progress.problem && <><ErrorNotice message={batch.progress.problem} /><button className="button" disabled={busy} onClick={() => void queueAction('retry')}>Retry processing</button></>}
            </div>
          )}
          {active && waitingForUpload && !busy && (!upload || upload.state === 'complete') && dropzone}
          {active && (data.interfaceVersion ?? 0) >= 21 && <ImportBackgroundOrganization key={batch.id} batch={batch} data={data} changed={() => void refresh()} onStateChange={setOrganizationState} />}
          {active && <div className="import-review-actions">
            <button className="button" disabled={busy || organizing || uploading || batch.progress.processing > 0} onClick={() => setDiscard(true)}>Discard staged import</button>
            <button className="button button-primary" disabled={busy || organizing || uploading || needsFiles || !included}
              onClick={() => { setApplyPreferences(false); setConfirm(true); }}>Review and import {included} files</button>
          </div>}
          {active && (data.interfaceVersion ?? 0) >= 22 && <ImportLinks key={`links-${batch.id}`} batch={batch} organizing={organizing} changed={() => void refresh()} />}
          {active && <div className="import-file-guidance">
            <h3>{organizing ? 'File preview · read-only for now' : 'Your files'}</h3>
            <p>{organizing ? 'The preview updates as Counsel OS prepares clear filing choices. You can inspect it while Counsel OS works; pause organization before editing.'
              : 'You don’t need to review every row. Open the list if you want to inspect a file, correct a location, or organize a group yourself.'}</p>
            {!organizing && <details><summary>What happens when I import?</summary><p>This adds new records. Use “Check for existing copies” to skip exact originals from earlier imports without merging or changing them. Practice guidance stays pending until you approve it.</p></details>}
          </div>}
          {batch.status === "committed" && (
            <p>
              {batch.receipt?.items.length} originals imported ·{" "}
              {batch.receipt?.matterIds.length} new matters. {batch.receipt?.workingPreferencesRevisionId
                ? <>Your reviewed working preferences were applied. <a href={href('knowledge', { section: 'preferences', view: 'documents' })}>Review Practice preferences</a>. </>
                : 'Existing records were left unchanged. '}
              <a href={href("references")}>Browse Sources</a>
            </p>
          )}
          {batch.status === 'committed' && modernPractice && <section className="import-practice-next">
            <h3>Did you bring instructions about how you work?</h3>
            <p>Importing a file does not turn its contents into your preferences. Bring the relevant files into chat and Counsel OS will propose one update, including Word attribution, for your confirmation.</p>
            <button className="button" onClick={() => setPracticeSources(true)}>Set up my practice from this import</button>
            <p className="fine-print">You can do this later from Practice → Your practice → Use saved instructions. Other imported documents are already available in their selected locations.</p>
          </section>}
          {batch.status === "discarded" && (
            <p>
              Staged file copies were discarded. Your original files and
              existing workspace records were not changed. Select the files
              again to start over.
            </p>
          )}
          {batch.receipt?.undo && <p role="status">Cleanup applied: {batch.receipt.undo.sourceIds.length} originals moved to <a href={href('trash')}>Trash</a>.
            {batch.receipt.undo.practiceIds.length > 0 && ` ${batch.receipt.undo.practiceIds.length} unreviewed practice items withdrawn.`}
            {batch.receipt.undo.templateIds.length > 0 && ` ${batch.receipt.undo.templateIds.length} templates disabled.`} Other records were kept.</p>}
          <details className="import-file-inspector" open={showFiles || organizationState === 'none' || !active}
            onToggle={event => setShowFiles(event.currentTarget.open)}>
          <summary>Inspect or edit individual files</summary>
          <div className="import-file-tools" ref={fileTools} tabIndex={-1} role="group" aria-label="Find and organize import files">
          <div className="import-filter-bar">
            <label className="filter-input"><Icon name="search" size={17} /><input aria-label="Find import files" placeholder="Find by name or folder…" value={query} onChange={event => { setQuery(event.target.value); setOffset(0); }} /></label>
            <label className="import-status-filter"><select aria-label="Filter import files" value={filter} onChange={event => { setFilter(event.target.value); setOffset(0); }}>
              <option value="all">All files</option><option value="attention">Needs attention</option><option value="ready">Ready</option><option value="waiting">Awaiting files or processing</option><option value="excluded">Skipped or excluded</option>
            </select></label>
          </div>
          {active && (data.interfaceVersion ?? 0) >= 13 && <div className="import-selection-bar" aria-label="Import selection">
            <div className="import-selection-main">
            <label><input type="checkbox" aria-label="Select files on this page" checked={batch.entries.some(item => item.status !== 'skipped') && batch.entries.filter(item => item.status !== 'skipped').every(item => selected.includes(item.id))}
                disabled={busy || organizing} onChange={event => { const ids = batch.entries.filter(item => item.status !== 'skipped').map(item => item.id);
                setSelected(values => event.target.checked ? [...new Set([...values, ...ids])] : values.filter(value => !ids.includes(value))); }} />Select page</label>
            <span>{selected.length} selected</span>
            <button type="button" className="text-button" disabled={busy || organizing} onClick={async () => {
              setBusy(true); setError('');
              try { const selection = await request<{ entryIds: string[] }>(`/imports/${batch.id}/selection?${new URLSearchParams({ query, status: filter })}`); setSelected(selection.entryIds); }
              catch (e) { setError((e as Error).message); } finally { setBusy(false); }
            }}>Select all matching files</button>
            {!!selected.length && <button type="button" className="text-button" disabled={busy} onClick={() => setSelected([])}>Clear selection</button>}
            </div>
            <div className="import-selection-actions">
              <button type="button" className="button" disabled={busy || organizing || !selected.length} onClick={() => setOrganize({ mode: 'bulk', revisionId: batch.revisionId, entryIds: [...selected] })}>Organize selected</button>
              <button type="button" className="button" disabled={busy || organizing || !selected.length || selected.length > 20}
                title="Select up to 20 ready, included files. Profile sources are reviewed separately."
                onClick={() => setOrganize({ mode: 'suggest', revisionId: batch.revisionId, entryIds: [...selected] })}><Icon name="work" size={15} />Suggest organization</button>
            </div>
          </div>}
          </div>
          <p className="import-results-summary fine-print" role="status">{batch.total ? `${batch.offset + 1}–${batch.offset + batch.entries.length} of ${batch.total} files` : 'No matching files'}</p>
          <div className="import-rows">
            {batch.entries.map((item) => {
              const receipt = batch.receipt?.items.find(
                (value) => value.entryId === item.id,
              );
              return (
                <div className="import-row" key={item.id}>
                  {active && (data.interfaceVersion ?? 0) >= 13 ? <input className="import-select-file" type="checkbox" aria-label={`Select ${item.path}`}
                    disabled={busy || organizing || item.status === 'skipped'} checked={selected.includes(item.id)}
                    onChange={event => setSelected(values => event.target.checked ? [...values, item.id] : values.filter(value => value !== item.id))} /> :
                  <Icon
                    name={
                      item.choice.destination === "source"
                        ? "reference"
                        : "knowledge"
                    }
                    size={19}
                  />}
                  <div className="import-row-copy">
                    <strong>{item.choice.title}</strong>
                    <small>{item.path}</small>
                    {(item.reason || item.notes.length > 0) && (
                      <p>{item.reason || item.notes.join(" ")}</p>
                    )}
                    {item.choice.matterTitle && (
                      <small>New matter: {item.choice.matterTitle}</small>
                    )}
                    {!!item.choice.linkedMatters?.length && <small>{active ? 'Will also be available in' : 'Imported with links to'} {item.choice.linkedMatters.length} reviewed matter{item.choice.linkedMatters.length === 1 ? '' : 's'}</small>}
                    {item.choice.matterId && (
                      <small>
                        Matter:{" "}
                        {data.matters.find(
                          (value) => value.id === item.choice.matterId,
                        )?.title ?? "Saved matter"}
                      </small>
                    )}
                  </div>
                  <div className="import-row-state">
                    <Badge tone={item.status === "error" ? "amber" : "neutral"}>
                      {item.status === "skipped"
                        ? "Excluded"
                        : item.choice.destination === "skip"
                          ? "Skipped"
                          : item.choice.destination === 'source' && item.choice.collection === 'external' ? 'External reference'
                            : item.choice.destination === 'source' && item.choice.collection === 'practice' ? 'Practice · File'
                              : item.choice.destination === 'source' ? item.choice.matterId || item.choice.matterTitle ? 'Matter document' : 'Unfiled' : destinations[item.choice.destination]}
                    </Badge>
                    {active && (
                      <small>
                        {item.status === "ready"
                          ? item.textStatus === "ready"
                            ? "Text available"
                            : "Check extraction"
                          : ({ awaiting_upload: 'Awaiting upload', queued: batch.progress.paused ? 'Queued · paused' : 'Queued', processing: 'Processing locally', error: 'Needs attention', skipped: 'Excluded', ready: 'Ready' }[item.phase])}
                      </small>
                    )}
                  </div>
                  {active && item.status !== "skipped" && (
                    <button
                      className="button"
                      disabled={busy || organizing}
                      onClick={() => setEntry(item)}
                      aria-label={`Review ${item.path}`}
                    >
                      Review
                    </button>
                  )}
                  {receipt && (
                    <a
                      className="button"
                      href={href("references", { id: receipt.sourceId })}
                    >
                      Open
                    </a>
                  )}
                </div>
              );
            })}
          </div>
          {(batch.total > 50 || offset > 0) && <div className="import-page-controls import-pagination">
            <span className="fine-print">Page {Math.floor(batch.offset / 50) + 1} of {Math.max(1, Math.ceil(batch.total / 50))}</span>
            <nav aria-label="Import file pages"><button className="button" disabled={!offset} onClick={() => changePage(Math.max(0, offset - 50))}>Previous page</button><button className="button" disabled={offset + 50 >= batch.total} onClick={() => changePage(offset + 50)}>Next page</button></nav>
          </div>}
          </details>
          {!active && (
            <a className="button" href={href("imports")}>
              Start another import
            </a>
          )}
          {(data.interfaceVersion ?? 0) >= 16 && batch.status !== 'discarded' && <div className="import-maintenance-entry">
            <button type="button" className="text-button" disabled={busy} onClick={() => setMaintenance(active ? 'duplicates' : 'undo')}>
              {active ? 'Check for existing copies' : batch.receipt?.undo ? 'View import cleanup' : 'Undo unused additions…'}
            </button>
          </div>}
        </section>
      )}
      {!!imports.length && !batch && (
        <section className="settings-section import-history">
          <h2>Recent imports</h2>
          {imports.map((item) => (
            <a href={href("imports", { id: item.id })} key={item.id}>
              <span>{item.label}</span>
              <Badge>
                {item.status !== 'review' ? item.status : item.progress.paused ? 'Paused' : item.progress.queued + item.progress.processing ? 'Processing' : item.progress.awaitingUpload ? 'Awaiting files' : item.progress.errors ? 'Needs attention' : 'Ready to review'}
              </Badge>
            </a>
          ))}
        </section>
      )}
      {entry && batch && (
        <ImportEntryEditor
          key={entry.id}
          entry={entry}
          batch={batch}
          data={data}
          close={() => setEntry(null)}
          saved={() => void refresh()}
        />
      )}
      {maintenance && batch && <ImportMaintenance batchId={batch.id} mode={maintenance} close={() => setMaintenance(null)}
        saved={() => { setMaintenance(null); setSelected([]); void refresh(); onChanged(); }} />}
      {organize && batch && <ImportOrganization batchId={batch.id} {...organize} data={data}
        close={() => setOrganize(null)} saved={() => { setSelected([]); void refresh(); }} />}
      {confirm && batch && (
        <Modal
          title="Bring these files into your workspace?"
          onClose={() => {
            if (!busy) setConfirm(false);
          }}
          busy={busy}
        >
          <div className="record-form">
            <p>
              {included} files will be added, with originals
              retained. Named new matters will be created. Practice guidance
              needs a separate approval.
            </p>
            <p className="fine-print">This includes all selected files in the import, not just the current page or search results.</p>
            {batch.selection.filingSummary && <ImportFilingPreview summary={batch.selection.filingSummary} />}
            {!!batch.selection.linkedMatters && <p>{batch.selection.linkedMatters} reviewed additional matter links will make supporting documents available to those matter chats. One original can support several matters.</p>}
            {templates > 0 && (
              <label className="model-default">
                <input
                  type="checkbox"
                  checked={shareTemplates}
                  onChange={(event) => setShareTemplates(event.target.checked)}
                />
                <span>
                  Make {templates} templates available across my
                  practice, including their contents.
                </span>
              </label>
            )}
            {!modernPractice && profile && !data.profile && (
              <label className="model-default">
                <input
                  type="checkbox"
                  checked={applyProfile}
                  onChange={(event) => setApplyProfile(event.target.checked)}
                />
                <span>
                  Set my profile to {profile.name}. Profile sharing starts off;
                  I can review it in Practice preferences.
                </span>
              </label>
            )}
            {!modernPractice && !!profiles && data.profile && <p className="fine-print">Your existing profile will be kept. Profile originals will be retained without applying their settings.</p>}
            {!modernPractice && profiles > 1 && !data.profile && applyProfile && (
              <ErrorNotice message="More than one profile was selected. Go back and choose one profile source, or turn off profile import." />
            )}
            {!modernPractice && !!batch.selection.preferences && <section className="import-preference-confirm">
              <h3>Reviewed working preferences</h3>
              <p className="fine-print">From {batch.selection.preferences.files} reviewed files. Selected instructions will apply to new responses; selected Word settings apply to new exports. This is independent of profile sharing.</p>
              {!!batch.selection.preferences.conflicts.length && <p className="status-banner">Resolve these conflicts before applying preferences: {batch.selection.preferences.conflicts.join(', ')}. You can still import the files without changing preferences.</p>}
              {batch.selection.preferences.review && <>
                <p>{IMPORT_WORKING_FIELDS.filter(field => batch.selection.preferences!.review!.changes[field.key] !== undefined).map(field => field.label).join(', ')}</p>
                <label className="model-default"><input type="checkbox" checked={applyPreferences} onChange={event => setApplyPreferences(event.target.checked)} />
                  <span>Apply these reviewed preference changes</span></label>
              </>}
            </section>}
            {modernPractice && <p className="fine-print">Your practice preferences and Word settings will not change during import. Afterwards, choose “Set up my practice from this import” to combine instructions in chat and review one proposed update.</p>}
            <p className="fine-print">
              After import, files and their matter links can be edited in the workspace. Import cleanup can undo unused, unchanged additions; it keeps profiles and working preferences. Edit those separately in Practice preferences. For an existing
              workspace,{" "}
              <a
                href={href("settings")}
                target="_blank"
                rel="noopener noreferrer"
              >
                download a backup first
              </a>
              . Restore creates a separate copy; it does not replace later work.
            </p>
            {error && <ErrorNotice message={error} />}
            <div className="form-actions">
              <button
                className="button"
                disabled={busy}
                onClick={() => setConfirm(false)}
              >
                Back to review
              </button>
              <button
                className="button button-primary"
                disabled={busy || (templates > 0 && !shareTemplates) || (!modernPractice && profiles > 1 && applyProfile && !data.profile)}
                onClick={async () => {
                  setBusy(true);
                  setError("");
                  try {
                    const next = await request<ImportBatch>(
                      `/imports/${batch.id}/commit`,
                      {
                        expectedRevisionId: batch.revisionId,
                        allowPracticeWideTemplates: shareTemplates,
                        profile: !modernPractice && applyProfile && !data.profile ? profile : null,
                        ...(!modernPractice && applyPreferences && batch.selection.preferences?.review ? { preferences: batch.selection.preferences.review } : {}),
                      },
                    );
                    setBatch(next);
                    setConfirm(false);
                    setApplyPreferences(false);
                    forgetImportUpload(batch.id);
                    onChanged();
                  } catch (e) {
                    setError((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {busy ? "Importing…" : "Import into workspace"}
              </button>
            </div>
          </div>
        </Modal>
      )}
      {discard && batch && (
        <Modal
          title="Discard this staged import?"
          onClose={() => {
            if (!busy) setDiscard(false);
          }}
          busy={busy}
        >
          <div className="record-form">
            <p>
              This removes the staged copies from the current workspace. Your
              original files and existing records stay unchanged. Earlier
              backups may still contain the staged copies.
            </p>
            <div className="form-actions">
              <button
                className="button"
                onClick={() => setDiscard(false)}
                disabled={busy}
              >
                Keep reviewing
              </button>
              <button
                className="button button-primary"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  setError("");
                  try {
                    setBatch(
                      await request<ImportBatch>(
                        `/imports/${batch.id}/discard`,
                        { expectedRevisionId: batch.revisionId },
                      ),
                    );
                    setDiscard(false);
                    forgetImportUpload(batch.id);
                  } catch (e) {
                    setError((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Discard staged copies
              </button>
            </div>
            {error && <ErrorNotice message={error} />}
          </div>
        </Modal>
      )}
      {practiceSources && batch && <PracticeSources batch={batch.id} close={() => setPracticeSources(false)} />}
    </>
  );
}

function ImportEntryEditor({
  entry,
  batch,
  data,
  close,
  saved,
}: {
  entry: ImportEntry;
  batch: ImportBatch;
  data: Snapshot;
  close: () => void;
  saved: (batch: ImportBatch) => void;
}): JSX.Element {
  const modernPractice = (data.interfaceVersion ?? 0) >= 33;
  const [choice, setChoice] = useState(entry.choice),
    [body, setBody] = useState<string | null>(null);
  const [profileMapping, setProfileMapping] = useState<ImportProfileMapping | null>(null);
  const [showProfile, setShowProfile] = useState(!!entry.choice.profile);
  const [preferenceMapping, setPreferenceMapping] = useState<ImportPreferenceMapping | null>(null);
  const [currentPreferences, setCurrentPreferences] = useState<WorkingPreferences | null>(null);
  const [preferenceReview, setPreferenceReview] = useState<ImportPreferenceReview | null>(entry.choice.preferences ?? null);
  const [reviewRevision] = useState(batch.revisionId);
  const [profile, editProfile] = useState<ProfileFields | null>(
      entry.choice.profile,
    ),
    [useProfile, setUseProfile] = useState(!!entry.choice.profile);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    const abort = new AbortController();
    Promise.all([request<{ body: string | null; profileSuggestion: ProfileFields | null; profileMapping?: ImportProfileMapping; preferenceMapping?: ImportPreferenceMapping }>(
      `/imports/${batch.id}/files/${entry.id}`,
      undefined,
      abort.signal,
    ), request<WorkingPreferences | null>('/working-preferences', undefined, abort.signal)])
      .then(([value, preferences]) => {
        if (!abort.signal.aborted) {
          setBody(value.body);
          editProfile(previous => previous ?? value.profileSuggestion);
          setProfileMapping(value.profileMapping ?? null);
          setPreferenceMapping(value.preferenceMapping ?? null);
          setCurrentPreferences(preferences);
        }
      })
      .catch((e) => {
        if (!abort.signal.aborted) setError(e.message);
      });
    return () => abort.abort();
  }, [batch.id, entry.id]);
  return (
    <Modal title="Review imported file" onClose={close} busy={busy}>
      <form
        className="record-form"
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          setError("");
          try {
            saved(
              await request<ImportBatch>(
                `/imports/${batch.id}/choices/${entry.id}`,
                {
                  expectedRevisionId: reviewRevision,
                  choice: {
                    ...choice,
                    preferences: !modernPractice && choice.destination === 'profile' ? preferenceReview : null,
                    profile:
                      !modernPractice && useProfile && profile && choice.destination === "profile"
                        ? profile
                        : null,
                  },
                },
              ),
            );
            close();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <p className="fine-print">{entry.path}</p>
        <label>
          Title
          <input
            aria-label="Import item title"
            value={choice.title}
            maxLength={200}
            required
            onChange={(event) =>
              setChoice({ ...choice, title: event.target.value })
            }
          />
        </label>
        <label>
          Use as
          <select
            aria-label="Import destination"
            value={choice.destination}
            onChange={(event) =>
              setChoice({
                ...choice,
                destination: event.target.value as ImportChoice["destination"],
                linkedMatters: ['source', 'skip'].includes(event.target.value) ? choice.linkedMatters : undefined,
              })
            }
          >
            {Object.entries(destinations).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        {choice.destination === 'source' && <label>Library location<select aria-label="Import library location" value={choice.collection ?? 'unfiled'}
          onChange={event => setChoice({ ...choice, collection: event.target.value as ImportChoice['collection'] })}>
          <option value="unfiled">Matter documents or unfiled</option><option value="external">Sources · External reference</option><option value="practice">Practice · File</option>
        </select></label>}
        <label>
          Matter
          <MatterPicker
            label="Import matter"
            value={choice.matterId ?? (choice.matterTitle ? "__new" : "")}
            onChange={(value) =>
              setChoice({
                ...choice,
                matterId:
                  value && value !== "__new"
                    ? value
                    : null,
                matterTitle:
                  value === "__new"
                    ? choice.matterTitle || "New matter"
                    : null,
              })
            }
            matters={data.matters}
            choices={[{ value: '', label: 'Outside a matter' }, { value: '__new', label: 'Create a new matter…' }]}
          />
        </label>
        {choice.matterTitle !== null && (
          <label>
            New matter name
            <input
              aria-label="New import matter"
              required
              maxLength={200}
              value={choice.matterTitle}
              onChange={(event) =>
                setChoice({ ...choice, matterTitle: event.target.value })
              }
            />
          </label>
        )}
        {!!choice.linkedMatters?.length && <section className="import-linked-matters"><h3>Additional matter sharing</h3>
          <p className="fine-print">These reviewed links are separate from the primary matter above. Remove any that should not have access after import.</p>
          <ul>{choice.linkedMatters.map((matter, index) => <li key={matter.matterId ?? matter.matterTitle}>
            <span>{matter.matterTitle ?? data.matters.find(item => item.id === matter.matterId)?.title ?? 'Selected existing matter'}</span>
            <button type="button" className="button button-quiet" onClick={() => setChoice({ ...choice, linkedMatters: choice.linkedMatters!.filter((_, at) => at !== index) })}>Remove</button>
          </li>)}</ul>
        </section>}
        {choice.destination === "template" && (
          <>
            <label>
              When to use it
              <textarea
                aria-label="Imported template use"
                required
                maxLength={2000}
                value={choice.whenToUse}
                onChange={(event) =>
                  setChoice({ ...choice, whenToUse: event.target.value })
                }
              />
            </label>
            <label>
              Jurisdiction
              <input
                value={choice.jurisdiction}
                maxLength={500}
                onChange={(event) =>
                  setChoice({ ...choice, jurisdiction: event.target.value })
                }
              />
            </label>
          </>
        )}
        {!modernPractice && choice.destination === "profile" && !data.profile && (profile || showProfile) && (
          <>
            <ImportProfileFields profile={profile} mapping={profileMapping} change={editProfile} />
            <label className="model-default">
              <input
                type="checkbox"
                checked={useProfile}
                disabled={!profile?.name.trim()}
                onChange={(event) => setUseProfile(event.target.checked)}
              />
              <span>Use these reviewed profile details at import</span>
            </label>
          </>
        )}
        {!modernPractice && choice.destination === "profile" && data.profile && (
          <p className="fine-print">
            You already have a profile. This file will be retained as a Source;
            it will not replace your details.
          </p>
        )}
        {!modernPractice && choice.destination === 'profile' && preferenceMapping && <ImportPreferenceFields mapping={preferenceMapping}
          current={currentPreferences} profile={data.profile} review={preferenceReview} change={setPreferenceReview} />}
        {!modernPractice && choice.destination === 'profile' && !data.profile && !profile && !showProfile && <button type="button" className="button" onClick={() => setShowProfile(true)}>Set up profile details from this file</button>}
        {!modernPractice && choice.destination !== 'profile' && choice.destination !== 'skip' && !!preferenceMapping && Object.keys(preferenceMapping.suggestion).length > 0 &&
          <p className="status-banner">This file has labeled working preferences. To review them as settings, choose “Profile &amp; preferences source” above. Keeping it as a document does not apply them.</p>}
        {modernPractice && choice.destination !== 'skip' && (choice.destination === 'profile' || practiceIntakeHint(body ?? '', choice.title)) && <aside className="import-practice-next">
          <h3>Possible practice instructions</h3><p>This file will be retained, not applied as settings. After import, choose “Set up my practice from this import” to develop it in chat and confirm one update. No special filename or fields are required.</p>
        </aside>}
        {entry.reason && <ErrorNotice message={entry.reason} />}
        {body !== null && (
          <details className="import-preview">
            <summary>Read extracted text</summary>
            <DocumentReader text={body} markdown={/\.md$/i.test(entry.path)} />
          </details>
        )}
        {error && <ErrorNotice message={error} />}
        <div className="form-actions">
          <button
            type="button"
            className="button"
            disabled={busy}
            onClick={close}
          >
            Cancel
          </button>
          <button className="button button-primary" disabled={busy}>
            Save import choice
          </button>
        </div>
      </form>
    </Modal>
  );
}
