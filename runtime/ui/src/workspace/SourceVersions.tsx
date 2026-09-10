import { useEffect, useRef, useState, type FormEvent } from 'react';
import { href, request, type Source, type SourceHistory } from './api';
import { ErrorNotice, fullDate, Modal, Status } from './components';

function SourceUpdate({
  source,
  mode,
  close,
  saved,
}: {
  source: Source;
  mode: 'file' | 'text';
  close: () => void;
  saved: (source: Source) => void;
}): JSX.Element {
  const [busy, setBusy] = useState(false),
    [dirty, setDirty] = useState(false),
    [error, setError] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const picker = useRef<HTMLInputElement>(null);
  const dismiss = () => {
    if (!busy && (!dirty || confirm('Discard this unsaved source update?'))) close();
  };
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    setError('');
    setBusy(true);
    try {
      let updated: Source;
      if (mode === 'file') {
        if (!file || !/\.(txt|md|docx|pdf)$/i.test(file.name))
          throw new Error('Choose a .docx, .pdf, .txt or .md file.');
        const limit = /\.(txt|md)$/i.test(file.name) ? 500_000 : 25_000_000;
        if (!file.size || file.size > limit)
          throw new Error(
            `Choose a nonempty file of ${limit === 500_000 ? '500 KB' : '25 MB'} or less.`,
          );
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result).split(',')[1]!);
          reader.onerror = () => reject(new Error('The file could not be read. Choose it again.'));
          reader.readAsDataURL(file);
        });
        updated = await request<Source>(`/sources/${source.id}/files`, {
          expectedRevisionId: source.latest.id,
          name: file.name,
          base64,
        });
      } else {
        updated = await request<Source>(`/sources/${source.id}/revisions`, {
          expectedRevisionId: source.latest.id,
          title: form.get('title'),
          body: form.get('body'),
          origin: form.get('origin'),
          author: form.get('author'),
          textStatus: form.get('textStatus'),
        });
      }
      saved(updated);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={mode === 'file' ? 'Add a document version' : 'Update saved source text'}
      onClose={dismiss}
      busy={busy}
    >
      <form className="record-form" onSubmit={submit} onChange={() => setDirty(true)}>
        <p className="form-intro">
          Updating <strong>{source.latest.title}</strong> from version {source.latest.number}.
          Earlier versions, original files and citations stay intact. Future searches use the newly
          saved version; existing chat attachments stay pinned.
        </p>
        {mode === 'file' ? (
          <div className="source-file-picker">
            <button
              type="button"
              className="button"
              disabled={busy}
              onClick={() => picker.current?.click()}
            >
              Choose revised document
            </button>
            <input
              ref={picker}
              hidden
              type="file"
              aria-label="Revised document"
              accept=".docx,.pdf,.txt,.md"
              disabled={busy}
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
              }}
            />
            <p>{file ? file.name : 'No file selected'}</p>
            <p className="fine-print">
              Word and PDF up to 25 MB; text and Markdown up to 500 KB. Extraction limits remain
              visible. Selecting a file does not save it until you confirm below.
            </p>
          </div>
        ) : (
          <>
            <label>
              Reference title
              <input
                name="title"
                defaultValue={source.latest.title}
                required
                maxLength={300}
                disabled={busy}
              />
            </label>
            <label>
              Source location
              <input
                name="origin"
                defaultValue={source.latest.provenance.origin}
                required
                maxLength={1000}
                disabled={busy}
              />
            </label>
            <label>
              Author (optional)
              <input
                name="author"
                defaultValue={source.latest.provenance.author ?? ''}
                maxLength={1000}
                disabled={busy}
              />
            </label>
            <label>
              Saved text
              <textarea
                aria-label="Saved text"
                name="body"
                defaultValue={source.latest.body ?? ''}
                required
                maxLength={1_000_000}
                rows={12}
                disabled={busy}
              />
            </label>
            <label>
              Text coverage
              <select
                aria-label="Text coverage"
                name="textStatus"
                defaultValue={source.latest.textStatus === 'partial' ? 'partial' : 'ready'}
                disabled={busy}
              >
                <option value="ready">Text available</option>
                <option value="partial">Partial text / known gaps</option>
              </select>
            </label>
            <p className="fine-print">
              This updates your saved copy only. Counsel does not fetch or verify the source
              location.
            </p>
          </>
        )}
        {error && <ErrorNotice message={error} />}
        <div className="dialog-actions">
          <button type="button" className="button button-quiet" disabled={busy} onClick={dismiss}>
            Cancel
          </button>
          <button className="button button-primary" disabled={busy || (mode === 'file' && !file)}>
            {busy ? 'Saving version…' : 'Save new version'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function SourceVersions({
  source,
  viewedRevisionId,
  updated,
}: {
  source: Source;
  viewedRevisionId: string;
  updated: (source: Source, message?: string) => void;
}): JSX.Element {
  const [history, setHistory] = useState<SourceHistory | null>(null),
    [error, setError] = useState('');
  const [retry, setRetry] = useState(0),
    [editing, setEditing] = useState<'file' | 'text' | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  async function refreshPublisher() {
    if (refreshing) return;
    setRefreshing(true); setError('');
    try {
      const value = await request<{ source: Source; receipt: { reused: boolean } }>(`/sources/${source.id}/refresh`, { expectedRevisionId: source.latest.id });
      updated(value.source, value.receipt.reused ? 'Publisher checked; the saved version is unchanged.' : 'A new publisher version was saved. Earlier citations still point to their original text.');
    } catch (e) { setError((e as Error).message); }
    finally { setRefreshing(false); }
  }
  useEffect(() => {
    const abort = new AbortController();
    request<SourceHistory>(`/sources/${source.id}/history`, undefined, abort.signal)
      .then((value) => {
        if (!abort.signal.aborted) {
          setHistory(value);
          setError('');
        }
      })
      .catch((e) => {
        if (!abort.signal.aborted) setError((e as Error).message);
      });
    return () => abort.abort();
  }, [source.id, source.latest.id, retry]);
  return (
    <section className="source-versions">
      <h2>Versions & updates</h2>
      {viewedRevisionId === source.latest.id && (
        <div className="source-version-actions">
          {source.latest.provenance.publication ? <button className="button" disabled={refreshing} onClick={refreshPublisher}>
            {refreshing ? 'Checking publisher…' : source.latest.provenance.publication.requestedDate ? 'Recheck historical version' : 'Check publisher for updates'}
          </button> : <button className="button" onClick={() => setEditing('file')}>
            Add document version
          </button>}
          {source.kind !== 'document' && !source.latest.original && (
            <button className="text-button" onClick={() => setEditing('text')}>
              Update saved text
            </button>
          )}
        </div>
      )}
      {error && <ErrorNotice message={error} retry={() => setRetry((n) => n + 1)} />}
      {history && (
        <>
          <details open={history.totalVersions > 1}>
            <summary>
              {history.totalVersions} saved {history.totalVersions === 1 ? 'version' : 'versions'}
            </summary>
            <ol className="source-version-list">
              {history.versions.map((version) => (
                <li key={version.id}>
                  <a
                    href={href('references', { id: source.id, revision: version.id })}
                    aria-current={version.id === viewedRevisionId ? 'page' : undefined}
                  >
                    <strong>
                      Version {version.number}
                      {version.id === source.latest.id ? ' · Current' : ''}
                    </strong>
                    <span>{version.title}</span>
                    <small>
                      {fullDate(version.receivedAt)}
                      {version.hasOriginal ? ' · Original retained' : ''}
                    </small>
                    <Status value={version.textStatus} />
                  </a>
                </li>
              ))}
            </ol>
            {history.totalVersions > history.versions.length && (
              <p className="fine-print">
                Showing the most recent {history.versions.length}. Earlier versions remain
                accessible through their saved citations.
              </p>
            )}
          </details>
          {history.totalAffectedWork > 0 && (
            <div className="source-affected-work">
              <h3>Earlier work to revisit</h3>
              <p>
                {history.totalAffectedWork} saved{' '}
                {history.totalAffectedWork === 1 ? 'record links' : 'records link'} to a previous
                version, directly or through recorded evidence. Their conclusions have not been automatically reassessed.
              </p>
              <ul>
                {history.affectedWork.map((work) => (
                  <li key={work.id}>
                    <a href={href('work', { id: work.id })}>{work.title}</a>
                  </li>
                ))}
              </ul>
              <p className="fine-print">
                Follows explicit citations through saved work and practice material. Uncited reliance is not included.
                {history.totalAffectedWork > history.affectedWork.length &&
                  ` Showing ${history.affectedWork.length} of ${history.totalAffectedWork}.`}
              </p>
            </div>
          )}
        </>
      )}
      {editing && (
        <SourceUpdate
          source={source}
          mode={editing}
          close={() => setEditing(null)}
          saved={(value) => {
            setEditing(null);
            updated(value);
          }}
        />
      )}
    </section>
  );
}
