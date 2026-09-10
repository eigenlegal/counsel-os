import { useEffect, useRef, useState } from 'react';
import { request, type Source } from './api';
import { ErrorNotice } from './components';
import { Icon } from './icons';
import { useDocumentDrop } from './document-drop';
import { fileBase64 } from './import-files';

export function DocumentUpload({
  matterId,
  disabled,
  imported,
  busyChanged,
  initialFiles,
  maxFiles = 1,
  completed,
}: {
  matterId?: string;
  disabled?: boolean;
  imported: (source: Source) => void;
  busyChanged?: (busy: boolean) => void;
  initialFiles?: File[];
  maxFiles?: number;
  completed?: () => void;
}): JSX.Element {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const [progress, setProgress] = useState('');
  const inFlight = useRef(false), started = useRef(false), alive = useRef(true);
  const callbacks = useRef({ imported, busyChanged, completed });
  callbacks.current = { imported, busyChanged, completed };
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => {
    if (!started.current && initialFiles?.length) { started.current = true; void upload(initialFiles); }
  }, [initialFiles]);
  async function upload(files: File[]) {
    if (inFlight.current) return;
    if (disabled) { setError('This chat has reached its document limit, or another action is still running. Remove a pending attachment or start a new chat.'); return; }
    setError('');
    if (files.length > maxFiles) {
      setError(`Choose up to ${maxFiles} more ${maxFiles === 1 ? 'document' : 'documents'}. No files from this selection were uploaded.`);
      return;
    }
    for (const file of files) {
      if (!/\.(txt|md|docx|pdf)$/i.test(file.name)) {
        setError(`${file.name}: Choose a .docx, .pdf, .txt or .md file. Convert legacy .doc files to .docx first. No files from this selection were uploaded.`); return;
      }
      const limit = /\.(txt|md)$/i.test(file.name) ? 500_000 : 25_000_000;
      if (!file.size || file.size > limit) {
        setError(`${file.name}: Choose a nonempty file of ${limit === 500_000 ? '500 KB' : '25 MB'} or less. No files from this selection were uploaded.`); return;
      }
    }
    inFlight.current = true;
    setBusy(true);
    busyChanged?.(true);
    let current = '', count = 0;
    try {
      for (const file of files) {
        if (!alive.current) break;
        current = file.name;
        setProgress(`Reading ${count + 1} of ${files.length}: ${file.name}`);
        const source = await request<Source>('/files', { name: file.name, base64: await fileBase64(file), matterId: matterId ?? null });
        if (!alive.current) break;
        callbacks.current.imported(source); count++;
      }
      if (alive.current && count === files.length) callbacks.current.completed?.();
    } catch (e) {
      if (alive.current) setError(`${current}: ${(e as Error).message}${count ? ` ${count} earlier ${count === 1 ? 'document was' : 'documents were'} added successfully; remaining files were not attempted.` : ''}`);
    } finally {
      inFlight.current = false;
      if (alive.current) { setBusy(false); setProgress(''); }
      callbacks.current.busyChanged?.(false);
    }
  }
  const drop = useDocumentDrop(files => { void upload(files); }, busy || !!disabled, setError);
  return (
    <div className="document-upload">
      <label className={`file-drop-label ${drop.dragging ? 'dragging' : ''}`} {...drop.handlers}>
        <Icon name="attach" size={23} />
        <strong>{busy ? 'Reading your document…' : drop.dragging ? 'Drop to add documents' : maxFiles === 1 ? 'Drop a document here or choose a file' : 'Drop documents here or choose files'}</strong>
        <span>Word .docx or PDF up to 25 MB · text or Markdown up to 500 KB</span>
        <input
          aria-label="Upload document"
          type="file"
          multiple={maxFiles > 1}
          accept=".txt,.md,.docx,.pdf"
          disabled={busy || disabled}
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            event.target.value = '';
            if (files.length) void upload(files);
          }}
        />
      </label>
      {busy && <p className="upload-progress" role="status">{progress}</p>}
      <p className="fine-print">
        Original retained locally. PDF text extraction supports up to 300 pages; scanned pages need
        OCR, which is not connected yet. Word changes and comments remain marked in extracted text.
        Uploading makes no model call.
      </p>
      {error && <ErrorNotice message={error} />}
    </div>
  );
}
