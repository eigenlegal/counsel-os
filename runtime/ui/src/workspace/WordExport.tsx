import { useEffect, useRef, useState } from 'react';
import { downloadWord, request, href, type WordExport as SavedExport } from './api';
import { ErrorNotice, fullDate } from './components';

export function WordExport({
  workId,
  compact = false,
  label = 'Download Word',
}: {
  workId: string;
  compact?: boolean;
  label?: string;
}): JSX.Element {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const [files, setFiles] = useState<SavedExport[]>([]),
    [latest, setLatest] = useState<SavedExport | null>(null);
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    const controller = new AbortController();
    if (!compact)
      request<SavedExport[]>(`/work/${workId}/exports`, undefined, controller.signal)
        .then(setFiles)
        .catch((e) => {
          if (!controller.signal.aborted) setError((e as Error).message);
        });
    return () => {
      active.current = false;
      controller.abort();
    };
  }, [workId, compact]);
  async function download(saved?: SavedExport) {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const file = saved ?? (await request<SavedExport>(`/work/${workId}/exports`, {}));
      if (active.current) {
        setLatest(file);
        setFiles((old) => [file, ...old.filter((f) => f.id !== file.id)]);
      }
      await downloadWord(file.id, file.name);
    } catch (e) {
      if (active.current) setError((e as Error).message);
    } finally {
      if (active.current) setBusy(false);
    }
  }
  return (
    <div className={compact ? 'word-export word-export-compact' : 'word-export'}>
      <button
        className={compact ? undefined : 'button'}
        disabled={busy}
        onClick={() => void download()}
        title="Editable Word text with saved source excerpts. No model call or approval."
      >
        {busy ? 'Preparing Word…' : label}
      </button>
      {compact && <a href={href('work', { id: workId })}>Files and sources</a>}
      {!compact && (
        <p className="fine-print">
          Editable text with a source appendix. Not a redline or an approval. The saved Word file
          stays in this workspace; edits to downloaded copies do not sync back.
        </p>
      )}
      {latest && !error && (
        <span className="fine-print" role="status">
          Word file prepared.{' '}
          {latest.warnings.length
            ? 'See the export notes in the document.'
            : 'Sources and status preserved.'}
        </span>
      )}
      {!compact && files.length > 0 && (
        <details>
          <summary>Saved Word files ({files.length})</summary>
          <ul className="word-export-files">
            {files.map((file) => (
              <li key={file.id}>
                <button disabled={busy} onClick={() => void download(file)}>
                  {file.name}
                </button>
                <span>{fullDate(file.createdAt)}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
      {error && <ErrorNotice message={error} />}
    </div>
  );
}
